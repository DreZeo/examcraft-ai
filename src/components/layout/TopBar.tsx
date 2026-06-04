import { useTranslation } from "react-i18next";
import { usePaperStore } from "../../stores/paperStore";
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
    <header className="no-print flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <input
        aria-label={t("app.title")}
        value={paper.title}
        placeholder={t("app.untitled")}
        onChange={(e) => setTitle(e.currentTarget.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />

      <span className="shrink-0 text-xs text-slate-400">
        {t(`saveStatus.${saveStatus}`)}
      </span>

      <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-300 text-xs">
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

      <button
        type="button"
        onClick={newPaper}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        {t("app.newPaper")}
      </button>

      <ExportMenu />

      <button
        type="button"
        aria-label={t("settings.title")}
        onClick={onOpenSettings}
        className="shrink-0 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
      >
        ⚙
      </button>
    </header>
  );
}

const activeTab = "bg-indigo-600 px-2 py-1 font-medium text-white";
const inactiveTab = "bg-white px-2 py-1 text-slate-600 hover:bg-slate-50";
