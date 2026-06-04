import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../stores/configStore";
import { useAssistantStore, type ChatMessage } from "../../stores/assistantStore";
import { Markdown } from "../paper/Markdown";
import { ConfirmationCard } from "./ConfirmationCard";
import { ResultCard } from "./ResultCard";
import { ErrorCard } from "./ErrorCard";

interface AssistantDrawerProps {
  open: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

/**
 * Right-side AI assistant drawer. Push-style: when open it occupies a fixed
 * width and the paper shrinks; when collapsed it leaves a narrow rail with the
 * expand control. Renders the chat (bubbles + confirmation/result/error cards),
 * the live streaming bubble, and a multi-line composer (Enter = send,
 * Shift+Enter = newline) with a stop button while streaming.
 */
export function AssistantDrawer({
  open,
  onToggle,
  onOpenSettings,
}: AssistantDrawerProps) {
  const { t } = useTranslation();
  const activeConfig = useConfigStore((s) => s.activeConfig());
  const messages = useAssistantStore((s) => s.messages);
  const status = useAssistantStore((s) => s.status);
  const streamBuffer = useAssistantStore((s) => s.streamBuffer);
  const focusedQuestion = useAssistantStore((s) => s.focusedQuestion);
  const sendMessage = useAssistantStore((s) => s.sendMessage);
  const stop = useAssistantStore((s) => s.stop);
  const clearFocus = useAssistantStore((s) => s.clearFocus);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const streaming = status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamBuffer]);

  function submit() {
    const text = draft.trim();
    if (!text || streaming || !activeConfig) return;
    setDraft("");
    void sendMessage(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (!open) {
    return (
      <div className="no-print flex w-10 shrink-0 flex-col items-center border-l border-slate-200 bg-white py-3">
        <button
          type="button"
          aria-label={t("assistant.expand")}
          title={t("assistant.expand")}
          onClick={onToggle}
          className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
        >
          ◀
        </button>
        <span className="mt-3 text-xs text-slate-400 [writing-mode:vertical-rl]">
          {t("assistant.title")}
        </span>
      </div>
    );
  }

  return (
    <aside className="no-print flex w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white transition-all duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">
            {t("assistant.title")}
          </p>
          {activeConfig && (
            <p className="truncate text-xs text-slate-400">
              {activeConfig.name} · {activeConfig.model}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={t("assistant.collapse")}
          title={t("assistant.collapse")}
          onClick={onToggle}
          className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
        >
          ▶
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {!activeConfig && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <p>{t("assistant.noModel")}</p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-2 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              {t("assistant.goToSettings")}
            </button>
          </div>
        )}

        {messages.map((m) => (
          <MessageItem key={m.id} message={m} onOpenSettings={onOpenSettings} />
        ))}

        {streaming && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {streamBuffer ? (
              <Markdown>{streamBuffer}</Markdown>
            ) : (
              <span className="text-slate-400">{t("assistant.thinking")}</span>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        {focusedQuestion && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
            <span className="truncate">{t("paper.aiModify")}: {focusedQuestion.type}</span>
            <button
              type="button"
              aria-label={t("settings.cancel")}
              onClick={() => clearFocus()}
              className="ml-2 shrink-0 rounded px-1 hover:bg-indigo-100"
            >
              ✕
            </button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          disabled={!activeConfig}
          rows={3}
          placeholder={t("assistant.placeholder")}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => void stop()}
            className="mt-2 w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t("assistant.stop")}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!activeConfig || !draft.trim()}
            className="mt-2 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("assistant.send")}
          </button>
        )}
      </div>
    </aside>
  );
}

function MessageItem({
  message,
  onOpenSettings,
}: {
  message: ChatMessage;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();

  switch (message.kind) {
    case "text":
      if (message.role === "user") {
        return (
          <div className="ml-8 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        );
      }
      return (
        <div className="mr-8 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <Markdown>{message.content}</Markdown>
        </div>
      );
    case "confirmation":
      return (
        <ConfirmationCard
          id={message.id}
          content={message.content}
          resolved={message.resolved}
        />
      );
    case "result":
      return (
        <ResultCard
          id={message.id}
          prose={message.prose}
          questions={message.questions}
          applied={message.applied}
        />
      );
    case "error":
      return (
        <ErrorCard
          code={message.code}
          detail={message.detail}
          raw={message.raw}
          retryExhausted={message.retryExhausted}
          onCheckSettings={onOpenSettings}
        />
      );
    default:
      return <span className="sr-only">{t("errors.unknown")}</span>;
  }
}
