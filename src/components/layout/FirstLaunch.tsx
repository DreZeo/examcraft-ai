import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { useConfigStore } from "../../stores/configStore";
import { defaultDataDir } from "../../lib/storage/tauri";

/**
 * First-launch screen: the user picks where their data lives. Transparency by
 * design — the path is shown and editable, with a recommended default.
 */
export function FirstLaunch() {
  const { t } = useTranslation();
  const chooseDataDir = useConfigStore((s) => s.chooseDataDir);
  const [dir, setDir] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void defaultDataDir().then(setDir);
  }, []);

  async function pick() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setDir(selected);
  }

  async function confirm() {
    if (!dir) return;
    setBusy(true);
    try {
      await chooseDataDir(dir);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">
          {t("firstLaunch.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("firstLaunch.description")}
        </p>

        <div className="mt-6 flex gap-2">
          <input
            aria-label={t("settings.dataDirectory")}
            value={dir}
            onChange={(e) => setDir(e.currentTarget.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={pick}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("firstLaunch.choose")}
          </button>
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={!dir || busy}
          className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("firstLaunch.confirm")}
        </button>
      </div>
    </div>
  );
}
