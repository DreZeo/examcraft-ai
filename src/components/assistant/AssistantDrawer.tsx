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
import { useAssistantStore } from "../../stores/assistantStore";
import type { ChatMessage } from "../../lib/types/library";
import { iconBtn, inputCls } from "../../lib/ui/styles";
import { Markdown } from "../paper/Markdown";
import { ConfirmationCard } from "./ConfirmationCard";
import { ResultCard } from "./ResultCard";
import { ErrorCard } from "./ErrorCard";
import { ChatHistoryPanel } from "./ChatHistoryPanel";

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
  const undoableResultId = useAssistantStore((s) => s.undoableResultId);
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

  return (
    <aside
      className="no-print motion-panel-shell relative flex shrink-0 overflow-hidden border-l border-border bg-card"
      data-resizing={resizing}
      style={{ width: open ? drawerWidth : 40 }}
    >
      <div
        className="motion-panel-content absolute inset-0 flex w-10 flex-col items-center bg-card py-3"
        data-open={!open}
        aria-hidden={open}
      >
        <button
          type="button"
          aria-label={t("assistant.expand")}
          title={t("assistant.expand")}
          onClick={onToggle}
          className={`${iconBtn} group`}
        >
          <PanelRightOpen className="h-5 w-5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
        </button>
        <span className="mt-3 text-xs text-muted-foreground/60 [writing-mode:vertical-rl]">
          {t("assistant.title")}
        </span>
        <div className="mt-2 h-px w-5 bg-border/50" />
      </div>
      <button
        type="button"
        aria-label={t("assistant.resize")}
        title={t("assistant.resize")}
        onPointerDown={beginResize}
        className={`absolute inset-y-0 left-0 z-20 w-2 -translate-x-1 cursor-col-resize transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          resizing ? "bg-primary/10" : ""
        } ${open ? "" : "pointer-events-none opacity-0"}`}
      />
      <div
        className="motion-panel-content flex h-full shrink-0 flex-col"
        data-open={open}
        aria-hidden={!open}
        style={{ width: drawerWidth }}
      >
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
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
            className={`${iconBtn} group`}
          >
            <PanelRightClose className="h-5 w-5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
          </button>
        </div>

        <ChatHistoryPanel />

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-auto bg-background/45 px-3 py-4"
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
            <MessageItem
              key={m.id}
              message={m}
              undoableResultId={undoableResultId}
              onOpenSettings={onOpenSettings}
            />
          ))}

          {streaming && (
            <div className="mr-8 animate-fade-in rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm">
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

        <div className="border-t border-border bg-card px-3 py-3">
          {focusedQuestion && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.08] px-2 py-1 text-xs font-medium text-primary">
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
          <div className="flex items-center gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={onKeyDown}
              disabled={!activeConfig}
              rows={1}
              placeholder={t("assistant.placeholder")}
              className={`${inputCls} min-h-9 flex-1 resize-none bg-background shadow-inner rounded-xl shadow-none focus:shadow-sm transition-shadow`}
            />
            {streaming ? (
              <button
                type="button"
                aria-label={t("assistant.stop")}
                title={t("assistant.stop")}
                onClick={() => void stop()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm transition-shadow hover:shadow-md hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                aria-label={t("assistant.send")}
                title={t("assistant.send")}
                onClick={submit}
                disabled={!activeConfig || !draft.trim()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-shadow hover:shadow-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MessageItem({
  message,
  undoableResultId,
  onOpenSettings,
}: {
  message: ChatMessage;
  undoableResultId: string | null;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();

  switch (message.kind) {
    case "text":
      if (message.role === "user") {
        return (
          <div className="ml-10 animate-fade-in rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-md">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        );
      }
      return (
        <div className="mr-8 flex animate-fade-in items-start gap-2">
          <span className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
            <Bot className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border/70 bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-shadow hover:shadow-md hover:border-border">
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
          operations={message.operations}
          questions={message.questions}
          applied={message.applied}
          undoable={undoableResultId === message.id}
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
