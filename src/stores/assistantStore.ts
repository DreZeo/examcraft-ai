import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Question } from "../lib/types/exam";
import type {
  ApiMessage,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  WebSearchResult,
} from "../lib/types/library";
import {
  createChatIndex,
  createChatSession,
  removeChatSessionMeta,
  renameChatSession,
  updateChatSessionContent,
  upsertChatSessionMeta,
} from "../lib/api/chatLibrary";
import { buildSystemPrompt, buildPaperContextMessage } from "../lib/api/systemPrompt";
import { validatePaperOperations } from "../lib/api/validatePaperOperations";
import { extractJson } from "../lib/api/extractJson";
import { type AppError } from "../lib/api/errorMessages";
import {
  buildSearchContextMessage,
  buildSearchToolInstructions,
  parseSearchWebToolCalls,
  type SearchWebContext,
  type SearchWebToolCall,
} from "../lib/api/webSearchTool";
import { inferQuestionTypeStrategy } from "../lib/exam/questionTypeStrategy";
import { summarizePaper } from "../lib/exam/summary";
import * as storage from "../lib/storage/tauri";
import { useConfigStore } from "./configStore";
import { usePaperStore } from "./paperStore";

/**
 * AI assistant chat state: message list (plain bubbles + special cards),
 * streaming buffer, and the two-phase / self-correction orchestration.
 *
 * Phase 1 (analyze + confirm): the model replies with no JSON; we render a
 * confirmation card. Phase 2 (generate): on confirm we ask for JSON, validate
 * it with Zod, and on failure re-invoke with the error fed back (max 3 tries).
 * Valid paper operations are previewed in a result card — never auto-applied.
 */

const MAX_JSON_RETRIES = 3;
const MAX_SEARCH_STEPS = 3;

type UserMessageResendResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "empty"
        | "streaming"
        | "notFound"
        | "unsupportedLegacy"
        | "appliedResultAfter";
    };

type TextMessage = Extract<ChatMessage, { kind: "text" }>;
type RequestContext = NonNullable<TextMessage["requestContext"]>;

interface AssistantState {
  messages: ChatMessage[];
  sessions: ChatSessionMeta[];
  activeSessionId: string | null;
  status: "idle" | "streaming" | "searching";
  /** Accumulated content of the in-flight assistant reply (typewriter view). */
  streamBuffer: string;
  /** Current web search query being executed between model calls. */
  activeSearchQuery: string | null;
  /** Question pulled into context via "AI modify"; switches apply to replace. */
  focusedQuestion: Question | null;
  /** Result card whose paper snapshot can currently be undone. */
  undoableResultId: string | null;

  loadForPaper: (paperId: string) => Promise<void>;
  newSession: () => Promise<void>;
  openSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (text: string, useWebSearch?: boolean) => Promise<void>;
  confirm: (cardId: string) => Promise<void>;
  dismissConfirmation: (cardId: string) => void;
  retry: () => Promise<void>;
  stop: () => Promise<void>;
  resendUserMessage: (messageId: string) => Promise<UserMessageResendResult>;
  editAndResendUserMessage: (
    messageId: string,
    nextText: string,
  ) => Promise<UserMessageResendResult>;
  applyResult: (cardId: string) => void;
  undoResult: (cardId: string) => void;
  focusQuestion: (question: Question) => void;
  clearFocus: () => void;
  reset: () => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => {
  // --- Turn-local state (singleton store, persists across runChat calls) ---
  /** Conversation as sent to the model (system prompt prepended at send time). */
  let apiHistory: ApiMessage[] = [];
  let activePaperId: string | null = null;
  let activeSession: ChatSession | null = null;
  /** JSON self-correction attempts for the current generation turn. */
  let retryCount = 0;
  let activeSearchContexts: SearchWebContext[] = [];
  let webSearchEnabledForTurn = false;
  let unlisteners: UnlistenFn[] = [];
  /**
   * Whether the current stream attempt has already been finalized (done OR
   * error). The backend surfaces failures on BOTH the `chat:error` event and the
   * rejected `invoke` promise, so without this guard a single failure would push
   * two error cards. Reset to `false` at the start of each stream attempt.
   */
  let settled = false;

  async function teardown() {
    const fns = unlisteners;
    unlisteners = [];
    await Promise.all(fns.map((fn) => fn()));
  }

  function pushMessage(message: ChatMessage) {
    set((s) => ({ messages: [...s.messages, message] }));
  }

  function now() {
    return new Date().toISOString();
  }

  function currentDataDir() {
    return useConfigStore.getState().dataDir;
  }

  async function persistSession() {
    const dataDir = currentDataDir();
    if (!dataDir || !activePaperId || !activeSession) return;
    activeSession = updateChatSessionContent(
      activeSession,
      get().messages,
      apiHistory,
      now(),
    );
    const index =
      (await storage.loadChatIndex(dataDir, activePaperId)) ??
      createChatIndex(activeSession);
    const nextIndex = upsertChatSessionMeta(index, activeSession);
    await storage.saveChatSession(dataDir, activePaperId, activeSession);
    await storage.saveChatIndex(dataDir, activePaperId, nextIndex);
    set({
      sessions: nextIndex.sessions,
      activeSessionId: nextIndex.activeSessionId,
    });
  }

  async function ensureSession(paperId: string): Promise<ChatSession> {
    const dataDir = currentDataDir();
    if (!dataDir) return createChatSession(paperId, now());
    const index = await storage.loadChatIndex(dataDir, paperId);
    const sessionId = index?.activeSessionId ?? index?.sessions[0]?.id ?? null;
    if (sessionId) {
      const existing = await storage.loadChatSession(dataDir, paperId, sessionId);
      if (existing) {
        await storage.saveChatIndex(dataDir, paperId, {
          ...(index ?? createChatIndex(existing)),
          activeSessionId: existing.id,
        });
        return existing;
      }
    }
    const created = createChatSession(paperId, now());
    await storage.saveChatSession(dataDir, paperId, created);
    await storage.saveChatIndex(dataDir, paperId, createChatIndex(created));
    return created;
  }

  async function activateSession(paperId: string, session: ChatSession) {
    const dataDir = currentDataDir();
    activePaperId = paperId;
    activeSession = session;
    apiHistory = session.apiHistory;
    if (dataDir) {
      const index =
        (await storage.loadChatIndex(dataDir, paperId)) ?? createChatIndex(session);
      const nextIndex = upsertChatSessionMeta(index, session);
      await storage.saveChatIndex(dataDir, paperId, nextIndex);
      set({
        sessions: nextIndex.sessions,
        activeSessionId: session.id,
        messages: session.messages,
        undoableResultId: null,
      });
      return;
    }
    set({
      sessions: [session],
      activeSessionId: session.id,
      messages: session.messages,
      undoableResultId: null,
    });
  }

  /** Build the full message array for the next API call. */
  function buildApiMessages(): ApiMessage[] {
    const configState = useConfigStore.getState();
    const summary = summarizePaper(usePaperStore.getState().paper);
    const questionTypeStrategy = inferQuestionTypeStrategy({
      requestText: userIntentContext(),
      paperSummary: summary,
    });
    const system = buildSystemPrompt(
      configState.config.settings,
      configState.activeAgent(),
    );
    const searchInstructions = webSearchEnabledForTurn
      ? `\n\n${buildSearchToolInstructions()}`
      : "";
    const paperContextMsg = buildPaperContextMessage(summary, questionTypeStrategy);
    const limit = configState.config.settings.contextMessageLimit ?? 0;
    const windowedHistory = applyContextWindow(apiHistory, limit);
    const messagesWithSearchContext =
      activeSearchContexts.length > 0
        ? ensureSearchContextMessage(
            windowedHistory,
            buildSearchContextMessage(activeSearchContexts),
          )
        : windowedHistory;
    return [
      { role: "system", content: `${system}${searchInstructions}` },
      ...(paperContextMsg ? [{ role: "user" as const, content: paperContextMsg }] : []),
      ...messagesWithSearchContext,
    ];
  }

  function userIntentContext(): string {
    return apiHistory
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .filter((content) => {
        const trimmed = content.trim();
        return (
          !trimmed.startsWith("Confirmed. Generate the paper operations now") &&
          !trimmed.startsWith("Your previous response did not pass validation:")
        );
      })
      .slice(-3)
      .join("\n\n");
  }

  function requestContent(text: string, context: RequestContext): string {
    if (context.kind === "modifyQuestion") {
      return `Modify the following question (keep its id "${context.question.id}"):\n${JSON.stringify(context.question)}\n\nRequest: ${text}`;
    }
    return text;
  }

  async function performWebSearch(
    query: string,
    toolCallId?: string,
  ): Promise<WebSearchResult[] | null> {
    const { config, getWebSearchApiKey } = useConfigStore.getState();
    const settings = config.settings.webSearch;
    let apiKey: string | null = null;
    try {
      apiKey = await getWebSearchApiKey(settings.activeProvider);
    } catch {
      apiKey = null;
    }
    if (!apiKey) {
      set({ activeSearchQuery: null });
      pushMessage({
        id: uuid(),
        kind: "error",
        code: "auth",
        detail: "Missing web search API key",
        retryExhausted: false,
        retryable: false,
      });
      return null;
    }

    try {
      set({ status: "searching", streamBuffer: "", activeSearchQuery: query });
      const results = await storage.webSearch({
        provider: settings.activeProvider,
        apiKey,
        query,
        resultCount: settings.resultCount,
        contentMode: settings.contentMode,
      });
      pushMessage({
        id: uuid(),
        kind: "webSearch",
        toolCallId,
        provider: settings.activeProvider,
        query,
        contentMode: settings.contentMode,
        results,
      });
      set({ activeSearchQuery: null });
      await persistSession();
      return results;
    } catch (err) {
      set({ activeSearchQuery: null });
      const error = toAppError(err);
      pushMessage({
        id: uuid(),
        kind: "error",
        code: error.code === "unknown" ? "searchFailed" : error.code,
        detail: error.detail,
        retryExhausted: false,
        retryable: false,
      });
      await persistSession();
      return null;
    }
  }

  function findUserMessage(messageId: string): {
    message: TextMessage;
    index: number;
  } | null {
    const index = get().messages.findIndex(
      (message) =>
        message.id === messageId &&
        message.kind === "text" &&
        message.role === "user",
    );
    if (index === -1) return null;
    return {
      message: get().messages[index] as TextMessage,
      index,
    };
  }

  function hasAppliedResultAfter(messageIndex: number): boolean {
    return get()
      .messages.slice(messageIndex + 1)
      .some((message) => message.kind === "result" && message.applied);
  }

  function resolveApiHistoryIndex(
    message: TextMessage,
    messageIndex: number,
  ): number | null {
    const recorded = message.apiHistoryIndex;
    if (
      recorded !== undefined &&
      apiHistory[recorded]?.role === "user"
    ) {
      return recorded;
    }

    const hasLaterUserText = get()
      .messages.slice(messageIndex + 1)
      .some((item) => item.kind === "text" && item.role === "user");
    if (hasLaterUserText) return null;

    for (let i = apiHistory.length - 1; i >= 0; i -= 1) {
      if (apiHistory[i]?.role === "user" && apiHistory[i]?.content === message.content) {
        return i;
      }
    }
    return null;
  }

  async function resendFromUserMessage(
    messageId: string,
    nextText?: string,
  ): Promise<UserMessageResendResult> {
    if (get().status !== "idle") return { ok: false, reason: "streaming" };

    const target = findUserMessage(messageId);
    if (!target) return { ok: false, reason: "notFound" };
    if (hasAppliedResultAfter(target.index)) {
      return { ok: false, reason: "appliedResultAfter" };
    }

    const text = (nextText ?? target.message.content).trim();
    if (!text) return { ok: false, reason: "empty" };

    const apiIndex = resolveApiHistoryIndex(target.message, target.index);
    if (apiIndex == null) return { ok: false, reason: "unsupportedLegacy" };

    const requestContext: RequestContext =
      target.message.requestContext ?? { kind: "plain" };
    apiHistory = apiHistory.slice(0, apiIndex);
    activeSearchContexts = [];
    webSearchEnabledForTurn = false;
    const nextApiIndex = apiHistory.length;
    apiHistory.push({
      role: "user",
      content: requestContent(text, requestContext),
    });

    const messages = get().messages.slice(0, target.index + 1);
    messages[target.index] = {
      ...target.message,
      content: text,
      apiHistoryIndex: nextApiIndex,
      requestContext,
    };
    const remainingIds = new Set(messages.map((message) => message.id));
    const undoableResultId = get().undoableResultId;

    set({
      messages,
      focusedQuestion: null,
      undoableResultId:
        undoableResultId && remainingIds.has(undoableResultId)
          ? undoableResultId
          : null,
    });
    await persistSession();
    await runChat();
    return { ok: true };
  }

  /** Stream one assistant turn. Listeners accumulate chunks; done/error finalize. */
  async function runChat(): Promise<void> {
    const active = useConfigStore.getState().activeConfig();
    if (!active) {
      pushMessage({
        id: uuid(),
        kind: "error",
        code: "unknown",
        retryExhausted: false,
      });
      return;
    }

    set({ status: "streaming", streamBuffer: "", activeSearchQuery: null });
    settled = false;

    let apiKey: string | null;
    try {
      apiKey = await storage.getApiKey(active.id);
    } catch {
      apiKey = null;
    }
    if (!apiKey) {
      set({ status: "idle", activeSearchQuery: null });
      pushMessage({
        id: uuid(),
        kind: "error",
        code: "auth",
        retryExhausted: false,
      });
      return;
    }

    unlisteners.push(
      await listen<string>("chat:chunk", (e) => {
        set((s) => ({ streamBuffer: s.streamBuffer + e.payload }));
      }),
    );
    unlisteners.push(
      await listen("chat:done", () => {
        void handleDone();
      }),
    );
    unlisteners.push(
      await listen<AppError>("chat:error", (e) => {
        void handleError(e.payload);
      }),
    );

    try {
      await invoke("stream_chat", {
        baseUrl: active.baseUrl,
        apiKey,
        model: active.model,
        messages: buildApiMessages(),
        temperature: active.temperature,
        maxTokens: active.maxTokens,
      });
    } catch (err) {
      await handleError(toAppError(err));
    }
  }

  async function handleDone(): Promise<void> {
    if (settled) return;
    settled = true;
    const reply = get().streamBuffer;
    await teardown();
    set({ status: "idle", streamBuffer: "", activeSearchQuery: null });

    const { json, prose } = extractJson(reply);

    if (webSearchEnabledForTurn) {
      const toolCalls = parseSearchWebToolCalls(reply);
      if (toolCalls.length > 0) {
        apiHistory.push({ role: "assistant", content: reply });
        const ok = await executeSearchToolCalls(toolCalls);
        if (!ok) return;
        await persistSession();
        await runChat();
        return;
      }
    }

    // Phase 1: no JSON -> the model is confirming understanding.
    if (!json) {
      apiHistory.push({ role: "assistant", content: reply });
      retryCount = 0;
      pushMessage({
        id: uuid(),
        kind: "confirmation",
        content: reply.trim(),
        resolved: false,
      });
      await persistSession();
      return;
    }

    // Phase 2: JSON present -> validate.
    const focused = get().focusedQuestion;
    const applyMode = focused ? "replace" : "append";
    const result = validatePaperOperations(
      reply,
      applyMode,
      inferQuestionTypeStrategy({
        requestText: userIntentContext(),
        paperSummary: summarizePaper(usePaperStore.getState().paper),
      }),
    );
    if (result.ok) {
      apiHistory.push({ role: "assistant", content: reply });
      retryCount = 0;
      pushMessage({
        id: uuid(),
        kind: "result",
        prose,
        operations: result.operations,
        applied: false,
      });
      await persistSession();
      return;
    }

    // Invalid JSON: self-correct up to MAX_JSON_RETRIES.
    if (retryCount < MAX_JSON_RETRIES - 1) {
      retryCount += 1;
      apiHistory.push({ role: "assistant", content: reply });
      apiHistory.push({
        role: "user",
        content: `Your previous response did not pass validation:\n${result.error}\n\nReturn the corrected paper operations as JSON inside a \`\`\`json fenced block. Output only valid JSON.`,
      });
      await persistSession();
      await runChat();
      return;
    }

    retryCount = 0;
    pushMessage({
      id: uuid(),
      kind: "error",
      code: "jsonRetryExhausted",
      detail: result.error,
      raw: result.raw,
      retryExhausted: true,
    });
    await persistSession();
  }

  async function executeSearchToolCalls(
    toolCalls: SearchWebToolCall[],
  ): Promise<boolean> {
    if (activeSearchContexts.length >= MAX_SEARCH_STEPS) {
      pushMessage({
        id: uuid(),
        kind: "error",
        code: "searchFailed",
        detail: `Search step limit reached (${MAX_SEARCH_STEPS}).`,
        retryExhausted: false,
        retryable: false,
      });
      await persistSession();
      return false;
    }

    const availableSlots = MAX_SEARCH_STEPS - activeSearchContexts.length;
    const calls = toolCalls.slice(0, availableSlots);
    const newContexts: SearchWebContext[] = [];

    for (const call of calls) {
      const results = await performWebSearch(call.query, call.id);
      if (results == null) return false;
      newContexts.push({ query: call.query, results });
    }

    activeSearchContexts = [...activeSearchContexts, ...newContexts];
    replaceSearchContextMessage(buildSearchContextMessage(activeSearchContexts));
    return true;
  }

  function beginTurn(useWebSearch: boolean) {
    retryCount = 0;
    activeSearchContexts = [];
    set({ activeSearchQuery: null });
    webSearchEnabledForTurn = useWebSearch;
  }

  function replaceSearchContextMessage(content: string) {
    const previousIndex = apiHistory.findIndex((message) =>
      isSearchContextMessage(message),
    );
    const nextMessage: ApiMessage = { role: "user", content };
    if (previousIndex === -1) {
      apiHistory.push(nextMessage);
      return;
    }
    apiHistory = [
      ...apiHistory.slice(0, previousIndex),
      nextMessage,
      ...apiHistory.slice(previousIndex + 1),
    ];
  }

  async function handleError(error: AppError): Promise<void> {
    if (settled) return;
    settled = true;
    await teardown();
    set({ status: "idle", streamBuffer: "", activeSearchQuery: null });
    pushMessage({
      id: uuid(),
      kind: "error",
      code: error.code,
      detail: error.detail,
      retryExhausted: false,
    });
    await persistSession();
  }

  return {
    messages: [],
    sessions: [],
    activeSessionId: null,
    status: "idle",
    streamBuffer: "",
    activeSearchQuery: null,
    focusedQuestion: null,
    undoableResultId: null,

    loadForPaper: async (paperId) => {
      await teardown();
      const session = await ensureSession(paperId);
      await activateSession(paperId, session);
      set({
        status: "idle",
        streamBuffer: "",
        activeSearchQuery: null,
        focusedQuestion: null,
        undoableResultId: null,
      });
    },

    newSession: async () => {
      const paperId = activePaperId ?? usePaperStore.getState().activePaperId;
      if (!paperId) return;
      const session = createChatSession(paperId, now());
      const dataDir = currentDataDir();
      if (dataDir) {
        await storage.saveChatSession(dataDir, paperId, session);
      }
      await activateSession(paperId, session);
    },

    openSession: async (id) => {
      const dataDir = currentDataDir();
      const paperId = activePaperId ?? usePaperStore.getState().activePaperId;
      if (!dataDir || !paperId) return;
      const session = await storage.loadChatSession(dataDir, paperId, id);
      if (session) await activateSession(paperId, session);
    },

    renameSession: async (id, title) => {
      const dataDir = currentDataDir();
      const paperId = activePaperId ?? usePaperStore.getState().activePaperId;
      if (!dataDir || !paperId) return;
      const session =
        id === activeSession?.id
          ? activeSession
          : await storage.loadChatSession(dataDir, paperId, id);
      if (!session) return;
      const renamed = renameChatSession(session, title, now());
      await storage.saveChatSession(dataDir, paperId, renamed);
      const index =
        (await storage.loadChatIndex(dataDir, paperId)) ?? createChatIndex(renamed);
      const nextIndex = upsertChatSessionMeta(index, renamed);
      await storage.saveChatIndex(dataDir, paperId, nextIndex);
      if (id === activeSession?.id) activeSession = renamed;
      set({
        sessions: nextIndex.sessions,
        activeSessionId: nextIndex.activeSessionId,
      });
    },

    deleteSession: async (id) => {
      const dataDir = currentDataDir();
      const paperId = activePaperId ?? usePaperStore.getState().activePaperId;
      if (!dataDir || !paperId) return;
      await storage.deleteChatSession(dataDir, paperId, id);
      const index =
        (await storage.loadChatIndex(dataDir, paperId)) ?? {
          version: 1,
          activeSessionId: null,
          sessions: [],
        };
      let nextIndex = removeChatSessionMeta(index, id);
      if (nextIndex.sessions.length === 0) {
        const created = createChatSession(paperId, now());
        await storage.saveChatSession(dataDir, paperId, created);
        nextIndex = createChatIndex(created);
      }
      await storage.saveChatIndex(dataDir, paperId, nextIndex);
      const nextId = nextIndex.activeSessionId ?? nextIndex.sessions[0]?.id;
      const session = nextId
        ? await storage.loadChatSession(dataDir, paperId, nextId)
        : null;
      if (session) await activateSession(paperId, session);
    },

    sendMessage: async (text, useWebSearch = false) => {
      const trimmed = text.trim();
      if (!trimmed || get().status !== "idle") return;
      beginTurn(useWebSearch);

      const focused = get().focusedQuestion;
      const requestContext: RequestContext = focused
        ? { kind: "modifyQuestion", question: focused }
        : { kind: "plain" };
      const content = requestContent(trimmed, requestContext);

      const apiHistoryIndex = apiHistory.length;
      apiHistory.push({ role: "user", content });
      pushMessage({
        id: uuid(),
        kind: "text",
        role: "user",
        content: trimmed,
        apiHistoryIndex,
        requestContext,
      });
      await persistSession();
      await runChat();
    },

    confirm: async (cardId) => {
      if (get().status !== "idle") return;
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === cardId && m.kind === "confirmation"
            ? { ...m, resolved: true }
            : m,
        ),
      }));
      retryCount = 0;
      webSearchEnabledForTurn = activeSearchContexts.length > 0 || webSearchEnabledForTurn;
      apiHistory.push({
        role: "user",
        content:
          "Confirmed. Generate the paper operations now as JSON inside a ```json fenced block.",
      });
      await persistSession();
      await runChat();
    },

    dismissConfirmation: (cardId) => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === cardId && m.kind === "confirmation"
            ? { ...m, resolved: true }
            : m,
        ),
      }));
      void persistSession();
    },

    retry: async () => {
      if (get().status !== "idle") return;
      retryCount = 0;
      await runChat();
    },

    stop: async () => {
      // Claim finalization synchronously so a cancellation `chat:done` racing
      // in during the awaits below can't also run handleDone on this turn.
      settled = true;
      try {
        await invoke("abort_chat");
      } catch {
        // ignore — abort is best-effort
      }
      await teardown();
      const reply = get().streamBuffer.trim();
      set({ status: "idle", streamBuffer: "", activeSearchQuery: null });
      if (reply) {
        apiHistory.push({ role: "assistant", content: reply });
        pushMessage({ id: uuid(), kind: "text", role: "assistant", content: reply });
        await persistSession();
      }
    },

    resendUserMessage: (messageId) => resendFromUserMessage(messageId),

    editAndResendUserMessage: (messageId, nextText) =>
      resendFromUserMessage(messageId, nextText),

    applyResult: (cardId) => {
      const card = get().messages.find(
        (m): m is Extract<ChatMessage, { kind: "result" }> =>
          m.id === cardId && m.kind === "result",
      );
      if (!card || card.applied) return;
      if (card.operations.length > 0) {
        usePaperStore.getState().applyAiOperations(card.operations);
      } else if (card.questions && card.applyMode) {
        usePaperStore.getState().applyAiQuestions(card.questions, card.applyMode);
      }
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === cardId && m.kind === "result" ? { ...m, applied: true } : m,
        ),
        focusedQuestion: null,
        undoableResultId: cardId,
      }));
      void persistSession();
    },

    undoResult: (cardId) => {
      const card = get().messages.find(
        (m): m is Extract<ChatMessage, { kind: "result" }> =>
          m.id === cardId && m.kind === "result",
      );
      if (!card || !card.applied || get().undoableResultId !== cardId) return;
      if (!usePaperStore.getState().undoSnapshot) return;

      usePaperStore.getState().undoApply();
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === cardId && m.kind === "result" ? { ...m, applied: false } : m,
        ),
        undoableResultId: null,
      }));
      void persistSession();
    },

    focusQuestion: (question) => set({ focusedQuestion: question }),
    clearFocus: () => set({ focusedQuestion: null }),

    reset: () => {
      void teardown();
      apiHistory = [];
      retryCount = 0;
      activeSession = null;
      activePaperId = null;
      activeSearchContexts = [];
      webSearchEnabledForTurn = false;
      set({
        messages: [],
        status: "idle",
        streamBuffer: "",
        activeSearchQuery: null,
        focusedQuestion: null,
        undoableResultId: null,
      });
    },
  };
});

export function applyContextWindow(history: ApiMessage[], limit: number): ApiMessage[] {
  if (limit <= 0 || history.length <= limit) return history;
  let start = history.length - limit;
  const msg = history[start];
  if (
    msg &&
    msg.role === "user" &&
    (msg.content.startsWith("Web search results for this turn.") ||
      msg.content.startsWith("Confirmed. Generate"))
  ) {
    start = Math.max(0, start - 1);
  }
  return history.slice(start);
}

function ensureSearchContextMessage(
  messages: ApiMessage[],
  searchContext: string,
): ApiMessage[] {
  if (messages.some((message) => isSearchContextMessage(message))) return messages;
  return [{ role: "user", content: searchContext }, ...messages];
}

function isSearchContextMessage(message: ApiMessage): boolean {
  return (
    message.role === "user" &&
    message.content.startsWith("Web search results for this turn.")
  );
}

function toAppError(err: unknown): AppError {
  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code: unknown; detail?: unknown };
    return {
      code: typeof e.code === "string" ? e.code : "unknown",
      detail: typeof e.detail === "string" ? e.detail : undefined,
    };
  }
  return { code: "unknown", detail: typeof err === "string" ? err : undefined };
}
