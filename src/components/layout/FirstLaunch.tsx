import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Loader2 } from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import { defaultDataDir } from "../../lib/storage/tauri";
import { primaryBtn, secondaryBtn, inputCls } from "../../lib/ui/styles";

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
    <div className="grid h-full place-items-center bg-background p-6">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          {t("firstLaunch.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("firstLaunch.description")}
        </p>

        <div className="mt-6 flex gap-2">
          <input
            aria-label={t("settings.dataDirectory")}
            value={dir}
            onChange={(e) => setDir(e.currentTarget.value)}
            className={inputCls + " min-w-0 flex-1"}
          />
          <button
            type="button"
            onClick={pick}
            className={secondaryBtn + " shrink-0"}
          >
            <FolderOpen className="h-4 w-4" />
            {t("firstLaunch.choose")}
          </button>
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={!dir || busy}
          className={primaryBtn + " mt-6 w-full"}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("firstLaunch.confirm")}
        </button>
      </div>
    </div>
  );
}
