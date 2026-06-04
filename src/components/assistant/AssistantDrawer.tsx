import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../stores/configStore";

interface AssistantDrawerProps {
  open: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

/**
 * Right-side AI assistant drawer. Push-style: when open it occupies a fixed
 * width and the paper shrinks; when collapsed it leaves a narrow rail with the
 * expand control. The chat itself (streaming, cards) is wired in PR2.
 */
export function AssistantDrawer({
  open,
  onToggle,
  onOpenSettings,
}: AssistantDrawerProps) {
  const { t } = useTranslation();
  const activeConfig = useConfigStore((s) => s.activeConfig());

  if (!open) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-l border-slate-200 bg-white py-3">
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
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white transition-all duration-200">
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

      <div className="min-h-0 flex-1 overflow-auto p-3">
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
      </div>

      <div className="border-t border-slate-200 p-3">
        <textarea
          disabled={!activeConfig}
          rows={3}
          placeholder={t("assistant.placeholder")}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
        />
        <button
          type="button"
          disabled={!activeConfig}
          className="mt-2 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("assistant.send")}
        </button>
      </div>
    </aside>
  );
}
