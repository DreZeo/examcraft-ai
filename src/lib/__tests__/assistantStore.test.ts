import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../types/library";
import type { ExamPaper, Question } from "../types/exam";
import { defaultAppConfig } from "../types/config";
import { useAssistantStore } from "../../stores/assistantStore";
import { useConfigStore } from "../../stores/configStore";
import { usePaperStore } from "../../stores/paperStore";

const tauriMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
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
    tauriMocks.listen.mockResolvedValue(vi.fn());
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
    tauriMocks.listen.mockResolvedValue(vi.fn());
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
