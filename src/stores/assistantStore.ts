import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Question } from "../lib/types/exam";
import { buildSystemPrompt } from "../lib/api/systemPrompt";
import { validateQuestions } from "../lib/api/validateQuestions";
import { extractJson } from "../lib/api/extractJson";
import { type AppError } from "../lib/api/errorMessages";
import { summarizePaper } from "../lib/exam/summary";
import { getApiKey } from "../lib/storage/tauri";
import { useConfigStore } from "./configStore";
import { usePaperStore } from "./paperStore";

/**
 * AI assistant chat state: message list (plain bubbles + special cards),
 * streaming buffer, and the two-phase / self-correction orchestration.
 *
 * Phase 1 (analyze + confirm): the model replies with no JSON; we render a
 * confirmation card. Phase 2 (generate): on confirm we ask for JSON, validate
 * it with Zod, and on failure re-invoke with the error fed back (max 3 tries).
 * Valid questions are previewed in a result card — never auto-applied.
 */

type ApiRole = "user" | "assistant" | "system";

interface ApiMessage {
  role: ApiRole;
  content: string;
}

export type ChatMessage =
  | { id: string; kind: "text"; role: ApiRole; content: string }
  | { id: string; kind: "confirmation"; content: string; resolved: boolean }
  | {
      id: string;
      kind: "result";
      prose: string;
      questions: Question[];
      applyMode: "append" | "replace";
      applied: boolean;
    }
  | {
      id: string;
      kind: "error";
      code: string;
      detail?: string;
      raw?: string;
      retryExhausted: boolean;
    };

const MAX_JSON_RETRIES = 3;

interface AssistantState {
  messages: ChatMessage[];
  status: "idle" | "streaming";
  /** Accumulated content of the in-flight assistant reply (typewriter view). */
  streamBuffer: string;
  /** Question pulled into context via "AI modify"; switches apply to replace. */
  focusedQuestion: Question | null;

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

  /** Build the full message array for the next API call. */
  function buildApiMessages(): ApiMessage[] {
    const { config } = useConfigStore.getState();
    const summary = summarizePaper(usePaperStore.getState().paper);
    const system = buildSystemPrompt(config.settings, summary);
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
      apiKey = await getApiKey(active.id);
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
      return;
    }

    // Phase 2: JSON present -> validate.
    const result = validateQuestions(reply);
    if (result.ok) {
      apiHistory.push({ role: "assistant", content: reply });
      retryCount = 0;
      const focused = get().focusedQuestion;
      pushMessage({
        id: uuid(),
        kind: "result",
        prose,
        questions: result.questions,
        applyMode: focused ? "replace" : "append",
        applied: false,
      });
      return;
    }

    // Invalid JSON: self-correct up to MAX_JSON_RETRIES.
    if (retryCount < MAX_JSON_RETRIES - 1) {
      retryCount += 1;
      apiHistory.push({ role: "assistant", content: reply });
      apiHistory.push({
        role: "user",
        content: `Your previous response did not pass validation:\n${result.error}\n\nReturn the corrected questions as JSON inside a \`\`\`json fenced block. Output only valid JSON.`,
      });
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
  }

  return {
    messages: [],
    status: "idle",
    streamBuffer: "",
    focusedQuestion: null,

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
          "Confirmed. Generate the questions now as JSON inside a ```json fenced block.",
      });
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
      }
    },

    applyResult: (cardId) => {
      const card = get().messages.find(
        (m): m is Extract<ChatMessage, { kind: "result" }> =>
          m.id === cardId && m.kind === "result",
      );
      if (!card || card.applied) return;
      usePaperStore.getState().applyAiQuestions(card.questions, card.applyMode);
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === cardId && m.kind === "result" ? { ...m, applied: true } : m,
        ),
        focusedQuestion: null,
      }));
    },

    focusQuestion: (question) => set({ focusedQuestion: question }),
    clearFocus: () => set({ focusedQuestion: null }),

    reset: () => {
      void teardown();
      apiHistory = [];
      retryCount = 0;
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
