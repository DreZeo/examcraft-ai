import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import { useAssistantStore, type ChatMessage } from "../../stores/assistantStore";
import { iconBtn, inputCls } from "../../lib/ui/styles";
import { Markdown } from "../paper/Markdown";
import { ConfirmationCard } from "./ConfirmationCard";
import { ResultCard } from "./ResultCard";
import { ErrorCard } from "./ErrorCard";

interface AssistantDrawerProps {
  open: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const DEFAULT_DRAWER_WIDTH = 400;
const MIN_DRAWER_WIDTH = 320;
const MAX_DRAWER_WIDTH = 560;
const MAX_VIEWPORT_RATIO = 0.42;

/**
 * Right-side AI assistant drawer. Push-style: when open it occupies a resizable
 * width and the paper shrinks; when collapsed it leaves a narrow rail with the
 * expand control. Renders the chat (bubbles + confirmation/result/error cards),
 * the live streaming bubble, and an inline composer (Enter = send,
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
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const [resizing, setResizing] = useState(false);
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

  function clampDrawerWidth(width: number) {
    const viewportMax =
      typeof window === "undefined"
        ? MAX_DRAWER_WIDTH
        : Math.floor(window.innerWidth * MAX_VIEWPORT_RATIO);
    return Math.min(
      Math.max(width, MIN_DRAWER_WIDTH),
      Math.max(MIN_DRAWER_WIDTH, Math.min(MAX_DRAWER_WIDTH, viewportMax)),
    );
  }

  function beginResize(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const pointerId = e.pointerId;
    e.currentTarget.setPointerCapture(pointerId);
    setResizing(true);

    function onPointerMove(event: PointerEvent) {
      setDrawerWidth(clampDrawerWidth(window.innerWidth - event.clientX));
    }

    function onPointerUp() {
      setResizing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  if (!open) {
    return (
      <div className="no-print flex w-10 shrink-0 flex-col items-center border-l border-border bg-card py-3">
        <button
          type="button"
          aria-label={t("assistant.expand")}
          title={t("assistant.expand")}
          onClick={onToggle}
          className={iconBtn}
        >
          <PanelRightOpen className="h-5 w-5" />
        </button>
        <span className="mt-3 text-xs text-muted-foreground [writing-mode:vertical-rl]">
          {t("assistant.title")}
        </span>
      </div>
    );
  }

  return (
    <aside
      className="no-print relative flex shrink-0 flex-col border-l border-border bg-card"
      style={{ width: drawerWidth }}
    >
      <button
        type="button"
        aria-label={t("assistant.resize")}
        title={t("assistant.resize")}
        onPointerDown={beginResize}
        className={`absolute inset-y-0 left-0 z-10 w-2 -translate-x-1 cursor-col-resize transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          resizing ? "bg-primary/10" : ""
        }`}
      />
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("assistant.title")}
            </p>
            {activeConfig && (
              <p className="truncate text-xs text-muted-foreground">
                {activeConfig.name} · {activeConfig.model}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={t("assistant.collapse")}
          title={t("assistant.collapse")}
          onClick={onToggle}
          className={iconBtn}
        >
          <PanelRightClose className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-auto bg-background/45 p-3"
      >
        {!activeConfig && (
          <div className="animate-fade-in rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("assistant.noModel")}</span>
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-amber-700 dark:hover:bg-amber-600 cursor-pointer"
            >
              {t("assistant.goToSettings")}
            </button>
          </div>
        )}

        {messages.map((m) => (
          <MessageItem key={m.id} message={m} onOpenSettings={onOpenSettings} />
        ))}

        {streaming && (
          <div className="mr-8 animate-fade-in rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm">
            {streamBuffer ? (
              <Markdown>{streamBuffer}</Markdown>
            ) : (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                {t("assistant.thinking")}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-3">
        {focusedQuestion && (
          <div className="mb-2 flex items-center justify-between rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
            <span className="truncate">{t("paper.aiModify")}: {focusedQuestion.type}</span>
            <button
              type="button"
              aria-label={t("settings.cancel")}
              title={t("settings.cancel")}
              onClick={() => clearFocus()}
              className="ml-2 inline-flex shrink-0 items-center justify-center rounded p-0.5 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            disabled={!activeConfig}
            rows={2}
            placeholder={t("assistant.placeholder")}
            className={`${inputCls} min-h-14 flex-1 resize-none bg-background shadow-inner`}
          />
          {streaming ? (
            <button
              type="button"
              aria-label={t("assistant.stop")}
              title={t("assistant.stop")}
              onClick={() => void stop()}
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              <Square className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label={t("assistant.send")}
              title={t("assistant.send")}
              onClick={submit}
              disabled={!activeConfig || !draft.trim()}
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>
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
          <div className="ml-10 animate-fade-in rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        );
      }
      return (
        <div className="mr-8 flex animate-fade-in items-start gap-2">
          <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 rounded-lg rounded-tl-sm border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:border-ring/40">
            <Markdown>{message.content}</Markdown>
          </div>
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
