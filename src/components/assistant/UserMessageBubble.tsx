import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import type { ChatMessage } from "../../lib/types/library";
import { useAssistantStore } from "../../stores/assistantStore";

interface UserMessageBubbleProps {
  message: Extract<ChatMessage, { kind: "text" }>;
}

/** User chat bubble with retry and inline edit-then-resend controls. */
export function UserMessageBubble({ message }: UserMessageBubbleProps) {
  const { t } = useTranslation();
  const status = useAssistantStore((s) => s.status);
  const resendUserMessage = useAssistantStore((s) => s.resendUserMessage);
  const editAndResendUserMessage = useAssistantStore(
    (s) => s.editAndResendUserMessage,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  useEffect(() => {
    if (!editing) setDraft(message.content);
  }, [editing, message.content]);

  function errorText(reason: string) {
    if (reason === "appliedResultAfter") {
      return t("assistant.retryBlockedApplied");
    }
    if (reason === "unsupportedLegacy") {
      return t("assistant.retryUnsupported");
    }
    return t("errors.unknown");
  }

  async function retry() {
    setError(null);
    const result = await resendUserMessage(message.id);
    if (!result.ok) setError(errorText(result.reason));
  }

  async function confirmEdit() {
    setError(null);
    const nextText = draft.trim();
    if (!nextText) return;
    setEditing(false);
    const result = await editAndResendUserMessage(message.id, draft);
    if (result.ok) {
      return;
    }
    setEditing(true);
    setError(errorText(result.reason));
  }

  function cancelEdit() {
    setDraft(message.content);
    setEditing(false);
    setError(null);
  }

  function onEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void confirmEdit();
    }
  }

  return (
    <div className="group ml-10 animate-fade-in">
      <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-md">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={onEditKeyDown}
              disabled={busy}
              rows={Math.max(2, draft.split("\n").length)}
              aria-label={t("assistant.editMessage")}
              className="min-h-16 w-full resize-none rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 shadow-inner outline-none transition-shadow focus:ring-2 focus:ring-primary-foreground/40 disabled:opacity-60"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40 cursor-pointer"
                aria-label={t("settings.cancel")}
                title={t("settings.cancel")}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void confirmEdit()}
                disabled={busy || !draft.trim()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                aria-label={t("assistant.resendEdited")}
                title={t("assistant.resendEdited")}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>
      {error && (
        <p className="ml-auto mt-1 max-w-[82%] rounded-lg border border-primary/15 bg-primary/8 px-2.5 py-1.5 text-xs font-medium leading-relaxed tracking-normal text-foreground/75 backdrop-blur-md dark:bg-primary/12 dark:text-foreground/80">
          {error}
        </p>
      )}
      {!editing && (
        <div className="mt-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => void retry()}
            disabled={busy}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            aria-label={t("assistant.retry")}
            title={t("assistant.retry")}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
            disabled={busy}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            aria-label={t("assistant.editMessage")}
            title={t("assistant.editMessage")}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
