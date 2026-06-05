import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  CircleAlert,
  FilePlus2,
  FileText,
  FolderOpen,
  Loader2,
  Settings,
} from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { iconBtn, ghostBtn } from "../../lib/ui/styles";
import { ExportMenu } from "./ExportMenu";

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenPaperManager: () => void;
}

/**
 * Slim top bar: editable paper title, save status, new-paper, teacher/student
 * view toggle, and the settings gear. Export lives here too (wired in PR3).
 */
export function TopBar({ onOpenSettings, onOpenPaperManager }: TopBarProps) {
  const { t } = useTranslation();
  const { paper, setTitle, saveStatus, view, setView, newPaper } =
    usePaperStore();
  const StatusIcon = statusIcon[saveStatus];
  const isBlank = !paper.title.trim() && paper.questions.length === 0;

  return (
    <header className="no-print flex items-center gap-3 border-b border-border bg-card px-4 py-2">
      {/* Title input */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          aria-label={t("app.title")}
          value={paper.title}
          placeholder={t("app.untitled")}
          onChange={(e) => setTitle(e.currentTarget.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="h-5 w-px shrink-0 bg-border" />

      {/* Save status */}
      <span className={statusPill[saveStatus]}>
        <StatusIcon
          className={saveStatus === "saving" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
        />
        <span className="hidden sm:inline">{t(`saveStatus.${saveStatus}`)}</span>
      </span>

      <div className="h-5 w-px shrink-0 bg-border" />

      {/* View toggle */}
      <div className="flex overflow-hidden rounded-md border border-border text-xs">
        <button
          type="button"
          onClick={() => setView("teacher")}
          className={view === "teacher" ? activeTab : inactiveTab}
        >
          {t("paper.teacherView")}
        </button>
        <button
          type="button"
          onClick={() => setView("student")}
          className={view === "student" ? activeTab : inactiveTab}
        >
          {t("paper.studentPreview")}
        </button>
      </div>

      <div className="h-5 w-px shrink-0 bg-border" />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => void newPaper()}
          disabled={isBlank}
          title={isBlank ? t("app.newPaperDisabled") : t("app.newPaper")}
          className={actionBtn + " disabled:pointer-events-none disabled:opacity-40"}
        >
          <FilePlus2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t("app.newPaper")}</span>
        </button>
        <button type="button" onClick={onOpenPaperManager} className={actionBtn}>
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">{t("paperLibrary.title")}</span>
        </button>
        <ExportMenu triggerClassName={actionBtn} />
        <button
          type="button"
          aria-label={t("settings.title")}
          title={t("settings.title")}
          onClick={onOpenSettings}
          className={iconBtn}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

const actionBtn =
  ghostBtn + " h-8 whitespace-nowrap";

const activeTab =
  "bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors cursor-pointer";
const inactiveTab =
  "px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer";

const statusIcon = {
  saved: CheckCircle2,
  saving: Loader2,
  unsaved: CircleAlert,
};

const statusPill = {
  saved:
    "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium text-emerald-700 dark:text-emerald-300",
  saving:
    "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium text-muted-foreground",
  unsaved:
    "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium text-amber-700 dark:text-amber-300",
};
