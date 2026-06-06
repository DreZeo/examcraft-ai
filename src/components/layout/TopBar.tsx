import { startTransition, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  GraduationCap,
  Loader2,
  Settings,
  UserCheck,
} from "lucide-react";
import { usePaperStore, type ViewMode } from "../../stores/paperStore";
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
  const paperTitle = usePaperStore((s) => s.paper.title);
  const questionCount = usePaperStore((s) => s.paper.questions.length);
  const setTitle = usePaperStore((s) => s.setTitle);
  const saveStatus = usePaperStore((s) => s.saveStatus);
  const view = usePaperStore((s) => s.view);
  const setView = usePaperStore((s) => s.setView);
  const newPaper = usePaperStore((s) => s.newPaper);
  const [optimisticView, setOptimisticView] = useState<ViewMode>(view);
  const StatusIcon = statusIcon[saveStatus];
  const isBlank = !paperTitle.trim() && questionCount === 0;

  useEffect(() => {
    setOptimisticView(view);
  }, [view]);

  function changeView(nextView: ViewMode) {
    if (nextView === optimisticView) return;
    setOptimisticView(nextView);
    startTransition(() => {
      setView(nextView);
    });
  }

  return (
    <header className="no-print flex items-center gap-3 border-b border-border bg-card px-4 py-2">
      {/* App brand */}
      <div className="flex shrink-0 items-center gap-2">
        <GraduationCap className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{t("app.title")}</span>
      </div>
      <div className="h-5 w-px shrink-0 bg-border" />

      {/* Title input */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          aria-label={t("app.title")}
          value={paperTitle}
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
      <div
        className="relative grid grid-cols-2 rounded-md border border-border bg-muted/50 p-0.5 text-xs shadow-sm"
        role="group"
        aria-label={t("paper.viewMode")}
      >
        <span
          aria-hidden="true"
          data-testid="view-toggle-indicator"
          className={
            "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-sm bg-card shadow-sm ring-1 ring-border/70 transition-transform duration-200 ease-out " +
            (optimisticView === "student" ? "translate-x-full" : "translate-x-0")
          }
        />
        <button
          type="button"
          aria-pressed={optimisticView === "teacher"}
          title={t("paper.teacherView")}
          onClick={() => changeView("teacher")}
          className={viewTab(optimisticView === "teacher")}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {t("paper.teacherView")}
        </button>
        <button
          type="button"
          aria-pressed={optimisticView === "student"}
          title={t("paper.studentPreview")}
          onClick={() => changeView("student")}
          className={viewTab(optimisticView === "student")}
        >
          <Eye className="h-3.5 w-3.5" />
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

function viewTab(active: boolean): string {
  return [
    "relative z-10 inline-flex h-7 min-w-[5.75rem] items-center justify-center gap-1.5 rounded-sm px-2.5",
    "text-xs font-medium transition-colors duration-150 cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}

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
