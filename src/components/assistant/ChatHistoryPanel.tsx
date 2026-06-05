import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  MessageSquarePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAssistantStore } from "../../stores/assistantStore";
import { inputCls } from "../../lib/ui/styles";

/** Paper-scoped assistant session list with create, switch, rename, and delete. */
export function ChatHistoryPanel() {
  const { t } = useTranslation();
  const sessions = useAssistantStore((s) => s.sessions);
  const activeSessionId = useAssistantStore((s) => s.activeSessionId);
  const newSession = useAssistantStore((s) => s.newSession);
  const openSession = useAssistantStore((s) => s.openSession);
  const renameSession = useAssistantStore((s) => s.renameSession);
  const deleteSession = useAssistantStore((s) => s.deleteSession);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const activeTitle =
    sessions.find((session) => session.id === activeSessionId)?.title ??
    t("assistant.newChat");

  function startRename(id: string, title: string) {
    setEditingId(id);
    setDraft(title);
  }

  function saveRename() {
    if (!editingId) return;
    void renameSession(editingId, draft);
    setEditingId(null);
    setDraft("");
  }

  return (
    <div className="border-b border-border px-3 py-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={
            open ? t("assistant.collapseHistory") : t("assistant.expandHistory")
          }
          title={
            open ? t("assistant.collapseHistory") : t("assistant.expandHistory")
          }
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
          <span className="shrink-0 text-xs text-muted-foreground/70">
            {t("assistant.history")}
          </span>
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {activeTitle}
          </span>
        </button>
        <button
          type="button"
          aria-label={t("assistant.newChat")}
          title={t("assistant.newChat")}
          onClick={() => void newSession()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={
                  active
                    ? "flex min-w-[10rem] max-w-[13rem] items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1"
                    : "flex min-w-[10rem] max-w-[13rem] items-center gap-1 rounded-md border border-border bg-background px-2 py-1"
                }
              >
                {editingId === session.id ? (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.currentTarget.value)}
                    onBlur={saveRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className={`${inputCls} h-7 min-w-0 px-2 py-1 text-xs`}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => void openSession(session.id)}
                    className="min-w-0 flex-1 truncate text-left text-xs text-foreground cursor-pointer"
                    title={session.title}
                  >
                    {session.title}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t("assistant.renameChat")}
                  title={t("assistant.renameChat")}
                  onClick={() => startRename(session.id, session.title)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("assistant.deleteChat")}
                  title={t("assistant.deleteChat")}
                  onClick={() => void deleteSession(session.id)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
