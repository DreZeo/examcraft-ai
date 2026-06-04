import { useTranslation } from "react-i18next";
import { Settings, FilePlus2 } from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { iconBtn, ghostBtn } from "../../lib/ui/styles";
import { ExportMenu } from "./ExportMenu";

interface TopBarProps {
  onOpenSettings: () => void;
}

/**
 * Slim top bar: editable paper title, save status, new-paper, teacher/student
 * view toggle, and the settings gear. Export lives here too (wired in PR3).
 */
export function TopBar({ onOpenSettings }: TopBarProps) {
  const { t } = useTranslation();
  const { paper, setTitle, saveStatus, view, setView, newPaper } =
    usePaperStore();

  return (
    <header className="no-print flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
      <input
        aria-label={t("app.title")}
        value={paper.title}
        placeholder={t("app.untitled")}
        onChange={(e) => setTitle(e.currentTarget.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
      />

      <span className="shrink-0 text-xs text-muted-foreground">
        {t(`saveStatus.${saveStatus}`)}
      </span>

      <div className="flex shrink-0 overflow-hidden rounded-md border border-border text-xs">
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

      <button type="button" onClick={newPaper} className={ghostBtn}>
        <FilePlus2 className="h-4 w-4" />
        {t("app.newPaper")}
      </button>

      <ExportMenu />

      <button
        type="button"
        aria-label={t("settings.title")}
        title={t("settings.title")}
        onClick={onOpenSettings}
        className={iconBtn}
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}

const activeTab =
  "bg-primary px-2.5 py-1.5 font-medium text-primary-foreground transition-colors cursor-pointer";
const inactiveTab =
  "bg-card px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer";
