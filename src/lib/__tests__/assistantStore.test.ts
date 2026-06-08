import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../types/library";
import type { ExamPaper, Question } from "../types/exam";
import { defaultAppConfig } from "../types/config";
import {
  useAssistantStore,
  applyContextWindow,
  splitThinking,
} from "../../stores/assistantStore";
import { useConfigStore } from "../../stores/configStore";
import { usePaperStore } from "../../stores/paperStore";

const tauriMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriMocks.invoke,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: tauriMocks.listen,
}));

function singleChoice(id: string): Question {
  return {
    id,
    type: "single-choice",
    content: `Question ${id}`,
    options: ["A", "B"],
    correctAnswer: 0,
    score: 5,
  };
}

function paper(questions: Question[] = []): ExamPaper {
  return { version: 1, title: "Test", questions };
}

function configureModel() {
  useConfigStore.setState({
    dataDir: null,
    config: {
      ...defaultAppConfig(),
      configs: [
        {
          id: "model-1",
          name: "Test Model",
          baseUrl: "https://example.test/v1",
          model: "test-model",
        },
      ],
      activeConfigId: "model-1",
    },
  });
}

function resultMessage(
  id: string,
  question: Question,
  applied = false,
): ChatMessage {
  return {
    id,
    kind: "result",
    prose: "",
    operations: [{ type: "appendQuestions", questions: [question] }],
    applied,
  };
}

describe("assistantStore AI result apply undo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tauriMocks.listeners = {};
    tauriMocks.listen.mockImplementation((event: string, callback: (event: { payload: unknown }) => void) => {
      tauriMocks.listeners[event] = callback;
      return Promise.resolve(vi.fn());
    });
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "get_api_key") return Promise.resolve("test-key");
      return Promise.resolve();
    });
    configureModel();
    useConfigStore.setState({ dataDir: null });
    usePaperStore.setState({
      paper: paper(),
      undoSnapshot: null,
      activePaperId: "paper-1",
      saveStatus: "saved",
    });
    useAssistantStore.getState().reset();
  });

  it("reopens the same result for apply after undo", () => {
    const generated = singleChoice("q-ai");
    useAssistantStore.setState({
      messages: [resultMessage("card-1", generated)],
      undoableResultId: null,
    });

    useAssistantStore.getState().applyResult("card-1");

    expect(usePaperStore.getState().paper.questions.map((q) => q.id)).toEqual([
      "q-ai",
    ]);
    expect(
      (useAssistantStore.getState().messages[0] as Extract<
        ChatMessage,
        { kind: "result" }
      >).applied,
    ).toBe(true);
    expect(useAssistantStore.getState().undoableResultId).toBe("card-1");

    useAssistantStore.getState().undoResult("card-1");

    expect(usePaperStore.getState().paper.questions).toEqual([]);
    expect(
      (useAssistantStore.getState().messages[0] as Extract<
        ChatMessage,
        { kind: "result" }
      >).applied,
    ).toBe(false);
    expect(useAssistantStore.getState().undoableResultId).toBeNull();

    useAssistantStore.getState().applyResult("card-1");

    expect(usePaperStore.getState().paper.questions.map((q) => q.id)).toEqual([
      "q-ai",
    ]);
    expect(
      (useAssistantStore.getState().messages[0] as Extract<
        ChatMessage,
        { kind: "result" }
      >).applied,
    ).toBe(true);
  });

  it("only lets the current undoable result be undone", () => {
    useAssistantStore.setState({
      messages: [
        resultMessage("card-1", singleChoice("q1")),
        resultMessage("card-2", singleChoice("q2")),
      ],
      undoableResultId: null,
    });

    useAssistantStore.getState().applyResult("card-1");
    useAssistantStore.getState().applyResult("card-2");
    useAssistantStore.getState().undoResult("card-1");

    expect(usePaperStore.getState().paper.questions.map((q) => q.id)).toEqual([
      "q1",
      "q2",
    ]);
    expect(useAssistantStore.getState().undoableResultId).toBe("card-2");
  });
});

describe("assistantStore user message resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tauriMocks.listeners = {};
    tauriMocks.listen.mockImplementation((event: string, callback: (event: { payload: unknown }) => void) => {
      tauriMocks.listeners[event] = callback;
      return Promise.resolve(vi.fn());
    });
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "get_api_key") return Promise.resolve("test-key");
      return Promise.resolve();
    });
    configureModel();
    usePaperStore.setState({
      paper: paper(),
      undoSnapshot: null,
      activePaperId: "paper-1",
      saveStatus: "saved",
    });
    useAssistantStore.getState().reset();
  });

  function lastStreamMessages(): Array<{ role: string; content: string }> {
    const calls = tauriMocks.invoke.mock.calls.filter(
      ([command]) => command === "stream_chat",
    );
    const call = calls[calls.length - 1];
    return call?.[1]?.messages ?? [];
  }

  async function sendAndSettle(text: string): Promise<Extract<ChatMessage, { kind: "text" }>> {
    await useAssistantStore.getState().sendMessage(text);
    const userMessage = useAssistantStore.getState()
      .messages[0] as Extract<ChatMessage, { kind: "text" }>;
    useAssistantStore.setState({
      status: "idle",
      messages: [
        userMessage,
        { id: "assistant-old", kind: "text", role: "assistant", content: "old reply" },
      ],
    });
    tauriMocks.invoke.mockClear();
    return userMessage;
  }

  it("retries a plain user message by truncating later chat and API context", async () => {
    const userMessage = await sendAndSettle("make a quiz");

    const result = await useAssistantStore
      .getState()
      .resendUserMessage(userMessage.id);

    expect(result).toEqual({ ok: true });
    expect(useAssistantStore.getState().messages).toHaveLength(1);
    const streamMessages = lastStreamMessages();
    expect(streamMessages[streamMessages.length - 1]).toMatchObject({
      role: "user",
      content: "make a quiz",
    });
  });

  it("edits and resends a user message", async () => {
    const userMessage = await sendAndSettle("make a quiz");

    const result = await useAssistantStore
      .getState()
      .editAndResendUserMessage(userMessage.id, "make an English quiz");

    expect(result).toEqual({ ok: true });
    expect(useAssistantStore.getState().messages[0]).toMatchObject({
      content: "make an English quiz",
    });
    const streamMessages = lastStreamMessages();
    expect(streamMessages[streamMessages.length - 1]).toMatchObject({
      role: "user",
      content: "make an English quiz",
    });
  });

  it("preserves focused question context when editing and resending", async () => {
    const question = singleChoice("q-focus");
    useAssistantStore.getState().focusQuestion(question);
    const userMessage = await sendAndSettle("make it harder");

    const result = await useAssistantStore
      .getState()
      .editAndResendUserMessage(userMessage.id, "make it easier");

    expect(result).toEqual({ ok: true });
    const streamMessages = lastStreamMessages();
    const content = streamMessages[streamMessages.length - 1]?.content ?? "";
    expect(content).toContain('keep its id "q-focus"');
    expect(content).toContain("Question q-focus");
    expect(content).toContain("Request: make it easier");
  });

  it("blocks retry when a later result was applied to the paper", async () => {
    const userMessage = await sendAndSettle("make a quiz");
    useAssistantStore.setState({
      status: "idle",
      messages: [
        userMessage,
        resultMessage("result-applied", singleChoice("q-ai"), true),
      ],
    });
    tauriMocks.invoke.mockClear();

    const result = await useAssistantStore
      .getState()
      .resendUserMessage(userMessage.id);

    expect(result).toEqual({ ok: false, reason: "appliedResultAfter" });
    expect(useAssistantStore.getState().messages).toHaveLength(2);
    expect(
      tauriMocks.invoke.mock.calls.some(([command]) => command === "stream_chat"),
    ).toBe(false);
  });

  it("does not retry while streaming", async () => {
    const userMessage = await sendAndSettle("make a quiz");
    useAssistantStore.setState({ status: "streaming" });
    tauriMocks.invoke.mockClear();

    const result = await useAssistantStore
      .getState()
      .resendUserMessage(userMessage.id);

    expect(result).toEqual({ ok: false, reason: "streaming" });
    expect(tauriMocks.invoke).not.toHaveBeenCalled();
  });
});

describe("assistantStore web search tool loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tauriMocks.listeners = {};
    tauriMocks.listen.mockImplementation((event: string, callback: (event: { payload: unknown }) => void) => {
      tauriMocks.listeners[event] = callback;
      return Promise.resolve(vi.fn());
    });
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "get_api_key") return Promise.resolve("test-key");
      if (command === "web_search") {
        return Promise.resolve([
          {
            title: "NCRE C exam trend",
            url: "https://example.test/ncre-c",
            snippet: "Recent C programming exam topics.",
            provider: "tavily",
          },
        ]);
      }
      return Promise.resolve();
    });
    configureModel();
    useConfigStore.setState({
      dataDir: null,
      config: {
        ...useConfigStore.getState().config,
        settings: {
          ...useConfigStore.getState().config.settings,
          webSearch: {
            activeProvider: "tavily",
            resultCount: 5,
            contentMode: "summary",
          },
        },
      },
    });
    usePaperStore.setState({
      paper: paper(),
      undoSnapshot: null,
      activePaperId: "paper-1",
      saveStatus: "saved",
    });
    useAssistantStore.getState().reset();
  });

  function streamCalls() {
    return tauriMocks.invoke.mock.calls.filter(
      ([command]) => command === "stream_chat",
    );
  }

  async function finishStreamWith(content: string) {
    tauriMocks.listeners["chat:chunk"]?.({ payload: content });
    tauriMocks.listeners["chat:done"]?.({ payload: undefined });
    await Promise.resolve();
  }

  async function waitForCondition(
    predicate: () => boolean,
    timeoutMs = 1000,
  ) {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for condition");
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  it("executes model-requested search and feeds results into the next model call", async () => {
    let resolveSearch!: (results: unknown[]) => void;
    const searchPromise = new Promise<unknown[]>((resolve) => {
      resolveSearch = resolve;
    });
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "get_api_key") return Promise.resolve("test-key");
      if (command === "web_search") return searchPromise;
      return Promise.resolve();
    });

    await useAssistantStore
      .getState()
      .sendMessage("生成计算机二级 C 语言最新趋势题", true);

    expect(streamCalls()).toHaveLength(1);
    const firstMessages = streamCalls()[0]?.[1]?.messages ?? [];
    expect(firstMessages[0]?.content).toContain("```search_web");

    await finishStreamWith(`
\`\`\`search_web
{"query":"计算机二级 C 语言 考试 趋势"}
\`\`\`
`);

    await waitForCondition(() =>
      tauriMocks.invoke.mock.calls.some(
        ([command]) => command === "web_search",
      ),
    );
    expect(useAssistantStore.getState().status).toBe("searching");
    expect(useAssistantStore.getState().activeSearchQuery).toBe(
      "计算机二级 C 语言 考试 趋势",
    );
    expect(
      tauriMocks.invoke.mock.calls.some(
        ([command, args]) =>
          command === "web_search" &&
          args.query === "计算机二级 C 语言 考试 趋势",
      ),
    ).toBe(true);
    resolveSearch([
      {
        title: "NCRE C exam trend",
        url: "https://example.test/ncre-c",
        snippet: "Recent C programming exam topics.",
        provider: "tavily",
      },
    ]);
    await waitForCondition(() =>
      useAssistantStore.getState().messages.some((message) => message.kind === "webSearch"),
    );
    await waitForCondition(() => streamCalls().length === 2);
    expect(streamCalls()).toHaveLength(2);

    const secondMessages = streamCalls()[1]?.[1]?.messages ?? [];
    const secondLastMessage = secondMessages[secondMessages.length - 1];
    expect(secondLastMessage?.role).toBe("user");
    expect(secondLastMessage?.content).toContain("Web search results for this turn");
    expect(secondLastMessage?.content).toContain("NCRE C exam trend");
  });

  it("keeps turn search context even when the context window is small", async () => {
    useConfigStore.setState({
      config: {
        ...useConfigStore.getState().config,
        settings: {
          ...useConfigStore.getState().config.settings,
          contextMessageLimit: 2,
        },
      },
    });
    await useAssistantStore
      .getState()
      .sendMessage("生成计算机二级 C 语言最新趋势题", true);

    await finishStreamWith(`
\`\`\`search_web
{"query":"计算机二级 C 语言 考试 趋势"}
\`\`\`
`);
    await waitForCondition(() => streamCalls().length === 2);
    await finishStreamWith("我会基于搜索资料生成题目。");
    await waitForCondition(() =>
      useAssistantStore.getState().messages.some((message) => message.kind === "confirmation"),
    );

    const confirmation = useAssistantStore
      .getState()
      .messages.find((message) => message.kind === "confirmation");
    expect(confirmation?.kind).toBe("confirmation");

    await useAssistantStore.getState().confirm(confirmation?.id ?? "");

    const calls = streamCalls();
    const lastMessages = calls[calls.length - 1]?.[1]?.messages ?? [];
    expect(
      lastMessages.some((message: { content: string }) =>
        message.content.includes("Web search results for this turn"),
      ),
    ).toBe(true);
    expect(
      lastMessages.some((message: { content: string }) =>
        message.content.includes("NCRE C exam trend"),
      ),
    ).toBe(true);
  });

  it("keeps search context when confirmation asks for JSON generation", async () => {
    await useAssistantStore
      .getState()
      .sendMessage("生成计算机二级 C 语言最新趋势题", true);

    await finishStreamWith(`
\`\`\`search_web
{"query":"计算机二级 C 语言 考试 趋势"}
\`\`\`
`);
    await waitForCondition(() => streamCalls().length === 2);
    await finishStreamWith("我会基于搜索资料生成题目。");
    await waitForCondition(() =>
      useAssistantStore.getState().messages.some((message) => message.kind === "confirmation"),
    );

    const confirmation = useAssistantStore
      .getState()
      .messages.find((message) => message.kind === "confirmation");
    expect(confirmation?.kind).toBe("confirmation");

    await useAssistantStore.getState().confirm(confirmation?.id ?? "");

    const calls = streamCalls();
    const lastMessages = calls[calls.length - 1]?.[1]?.messages ?? [];
    expect(lastMessages.some((message: { content: string }) => message.content.includes("NCRE C exam trend"))).toBe(true);
    expect(lastMessages[lastMessages.length - 1]?.content).toContain("Confirmed. Generate the paper operations now");
  });

  it("does not expose search tool instructions when web search is disabled", async () => {
    await useAssistantStore.getState().sendMessage("生成一份普通试卷", false);

    const messages = streamCalls()[0]?.[1]?.messages ?? [];
    expect(messages[0]?.content).not.toContain("```search_web");
    expect(
      tauriMocks.invoke.mock.calls.some(([command]) => command === "web_search"),
    ).toBe(false);
  });
});

describe("assistantStore reasoning streams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tauriMocks.listeners = {};
    tauriMocks.listen.mockImplementation((event: string, callback: (event: { payload: unknown }) => void) => {
      tauriMocks.listeners[event] = callback;
      return Promise.resolve(vi.fn());
    });
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "get_api_key") return Promise.resolve("test-key");
      if (command === "web_search") {
        return Promise.resolve([
          {
            title: "NCRE C",
            url: "https://example.test/c",
            snippet: "C exam",
            provider: "tavily",
          },
        ]);
      }
      return Promise.resolve();
    });
    configureModel();
    usePaperStore.setState({
      paper: paper(),
      undoSnapshot: null,
      activePaperId: "paper-1",
      saveStatus: "saved",
    });
    useAssistantStore.getState().reset();
  });

  async function waitForCondition(
    predicate: () => boolean,
    timeoutMs = 1000,
  ) {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for condition");
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  it("stores reasoning chunks on the final confirmation card without sending them back", async () => {
    await useAssistantStore.getState().sendMessage("生成一份普通试卷", false);

    tauriMocks.listeners["chat:reasoning-chunk"]?.({ payload: "先分析需求" });
    tauriMocks.listeners["chat:chunk"]?.({ payload: "我会生成一份试卷。" });
    tauriMocks.listeners["chat:done"]?.({ payload: undefined });

    await waitForCondition(() =>
      useAssistantStore.getState().messages.some((message) => message.kind === "confirmation"),
    );
    const confirmation = useAssistantStore
      .getState()
      .messages.find((message) => message.kind === "confirmation");
    expect(confirmation).toMatchObject({
      kind: "confirmation",
      content: "我会生成一份试卷。",
      reasoning: "先分析需求",
    });
    expect(useAssistantStore.getState().reasoningBuffer).toBe("");

    await useAssistantStore.getState().confirm(confirmation?.id ?? "");
    const calls = tauriMocks.invoke.mock.calls.filter(
      ([command]) => command === "stream_chat",
    );
    const lastMessages = calls[calls.length - 1]?.[1]?.messages ?? [];
    expect(
      lastMessages.some((message: { content: string }) =>
        message.content.includes("先分析需求"),
      ),
    ).toBe(false);
  });

  it("splits think tags out of visible content", () => {
    expect(splitThinking("<think>分析</think>最终答案")).toEqual({
      content: "最终答案",
      reasoning: "分析",
    });
    expect(splitThinking("开头<think>未闭合")).toEqual({
      content: "开头",
      reasoning: "未闭合",
    });
  });

  it("parses search tool calls after removing think tags", async () => {
    await useAssistantStore
      .getState()
      .sendMessage("联网搜索计算机二级 C 语言", true);

    tauriMocks.listeners["chat:chunk"]?.({
      payload:
        '<think>需要搜索</think>\n```search_web\n{"query":"计算机二级 C 语言"}\n```',
    });
    tauriMocks.listeners["chat:done"]?.({ payload: undefined });

    await waitForCondition(() =>
      tauriMocks.invoke.mock.calls.some(([command]) => command === "web_search"),
    );
    expect(
      tauriMocks.invoke.mock.calls.some(
        ([command, args]) =>
          command === "web_search" && args.query === "计算机二级 C 语言",
      ),
    ).toBe(true);
  });
});

describe("applyContextWindow", () => {
  function msg(role: "user" | "assistant", content: string) {
    return { role, content };
  }

  it("returns full history when limit is 0", () => {
    const h = [msg("user", "a"), msg("assistant", "b"), msg("user", "c")];
    expect(applyContextWindow(h, 0)).toBe(h);
  });

  it("returns full history when history length <= limit", () => {
    const h = [msg("user", "a"), msg("assistant", "b")];
    expect(applyContextWindow(h, 5)).toBe(h);
  });

  it("trims to the last N messages", () => {
    const h = [msg("user", "a"), msg("assistant", "b"), msg("user", "c"), msg("assistant", "d")];
    expect(applyContextWindow(h, 2)).toEqual([msg("user", "c"), msg("assistant", "d")]);
  });

  it("expands by one when cut lands on a search context user message", () => {
    const h = [
      msg("assistant", "search tool request"),
      msg("user", "Web search results for this turn. ..."),
      msg("assistant", "here are the results"),
    ];
    // limit=2 would start at index 1 (the search context message)
    const result = applyContextWindow(h, 2);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(msg("assistant", "search tool request"));
  });

  it("expands by one when cut lands on a Confirmed user message", () => {
    const h = [
      msg("assistant", "phase 1 confirmation prose"),
      msg("user", "Confirmed. Generate the paper operations now as JSON inside a ```json fenced block."),
      msg("assistant", '```json\n{"operations":[]}\n```'),
    ];
    // limit=2 starts at index 1
    const result = applyContextWindow(h, 2);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(msg("assistant", "phase 1 confirmation prose"));
  });

  it("does not go below index 0 when expanding", () => {
    const h = [
      msg("user", "Web search results for this turn. ..."),
      msg("assistant", "reply"),
    ];
    // limit=2 would start at 0, expansion clamps at 0
    expect(applyContextWindow(h, 2)).toBe(h);
  });
});
