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
} from "../lib/types/library";
import {
  createChatIndex,
  createChatSession,
  removeChatSessionMeta,
  renameChatSession,
  updateChatSessionContent,
  upsertChatSessionMeta,
} from "../lib/api/chatLibrary";
import { buildSystemPrompt } from "../lib/api/systemPrompt";
import { validatePaperOperations } from "../lib/api/validatePaperOperations";
import { extractJson } from "../lib/api/extractJson";
import { type AppError } from "../lib/api/errorMessages";
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

interface AssistantState {
  messages: ChatMessage[];
  sessions: ChatSessionMeta[];
  activeSessionId: string | null;
  status: "idle" | "streaming";
  /** Accumulated content of the in-flight assistant reply (typewriter view). */
  streamBuffer: string;
  /** Question pulled into context via "AI modify"; switches apply to replace. */
  focusedQuestion: Question | null;

  loadForPaper: (paperId: string) => Promise<void>;
  newSession: () => Promise<void>;
  openSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  confirm: (cardId: string) => Promise<void>;
  dismissConfirmation: (cardId: string) => void;
  retry: () => Promise<void>;
  stop: () => Promise<void>;
  applyResult: (cardId: string) => void;
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
      });
      return;
    }
    set({
      sessions: [session],
      activeSessionId: session.id,
      messages: session.messages,
    });
  }

  /** Build the full message array for the next API call. */
  function buildApiMessages(): ApiMessage[] {
    const configState = useConfigStore.getState();
    const summary = summarizePaper(usePaperStore.getState().paper);
    const system = buildSystemPrompt(
      configState.config.settings,
      summary,
      configState.activeAgent(),
    );
    return [{ role: "system", content: system }, ...apiHistory];
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

    set({ status: "streaming", streamBuffer: "" });
    settled = false;

    let apiKey: string | null;
    try {
      apiKey = await storage.getApiKey(active.id);
    } catch {
      apiKey = null;
    }
    if (!apiKey) {
      set({ status: "idle" });
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
    set({ status: "idle", streamBuffer: "" });

    const { json, prose } = extractJson(reply);

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
    const result = validatePaperOperations(reply, applyMode);
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

  async function handleError(error: AppError): Promise<void> {
    if (settled) return;
    settled = true;
    await teardown();
    set({ status: "idle", streamBuffer: "" });
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
    focusedQuestion: null,

    loadForPaper: async (paperId) => {
      await teardown();
      const session = await ensureSession(paperId);
      await activateSession(paperId, session);
      set({ status: "idle", streamBuffer: "", focusedQuestion: null });
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

    sendMessage: async (text) => {
      const trimmed = text.trim();
      if (!trimmed || get().status === "streaming") return;

      const focused = get().focusedQuestion;
      const content = focused
        ? `Modify the following question (keep its id "${focused.id}"):\n${JSON.stringify(focused)}\n\nRequest: ${trimmed}`
        : trimmed;

      retryCount = 0;
      apiHistory.push({ role: "user", content });
      pushMessage({ id: uuid(), kind: "text", role: "user", content: trimmed });
      await persistSession();
      await runChat();
    },

    confirm: async (cardId) => {
      if (get().status === "streaming") return;
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === cardId && m.kind === "confirmation"
            ? { ...m, resolved: true }
            : m,
        ),
      }));
      retryCount = 0;
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
      if (get().status === "streaming") return;
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
      set({ status: "idle", streamBuffer: "" });
      if (reply) {
        apiHistory.push({ role: "assistant", content: reply });
        pushMessage({ id: uuid(), kind: "text", role: "assistant", content: reply });
        await persistSession();
      }
    },

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
      set({ messages: [], status: "idle", streamBuffer: "", focusedQuestion: null });
    },
  };
});

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
