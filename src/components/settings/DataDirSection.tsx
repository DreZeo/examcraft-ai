import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useConfigStore } from "../../stores/configStore";

/** Data location: show current path, open in file manager, relocate. */
export function DataDirSection() {
  const { t } = useTranslation();
  const { dataDir, chooseDataDir } = useConfigStore();

  async function relocate() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") await chooseDataDir(selected);
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-medium text-slate-700">
          {t("settings.dataDirectory")}
        </p>
        <p className="mt-1 break-all rounded-md bg-slate-50 px-3 py-2 text-slate-600">
          {dataDir ?? "—"}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!dataDir}
          onClick={() => dataDir && void openPath(dataDir)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t("settings.openInExplorer")}
        </button>
        <button
          type="button"
          onClick={relocate}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("settings.changeLocation")}
        </button>
      </div>
    </div>
  );
}
