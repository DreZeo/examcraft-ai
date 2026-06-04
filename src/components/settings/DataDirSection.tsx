import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { FolderOpen, FolderInput, HardDrive } from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import { secondaryBtn } from "../../lib/ui/styles";

/** Data location: show current path, open in file manager, relocate. */
export function DataDirSection() {
  const { t } = useTranslation();
  const { dataDir, chooseDataDir } = useConfigStore();

  async function relocate() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") await chooseDataDir(selected);
  }

  return (
    <div className="flex min-h-[24rem] flex-col gap-4 text-sm">
      <div className="rounded-md border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {t("settings.dataDirectory")}
          </p>
        </div>
        <p className="mt-3 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {dataDir ?? "—"}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!dataDir}
          onClick={() => dataDir && void openPath(dataDir)}
          className={secondaryBtn}
        >
          <FolderOpen className="h-4 w-4" />
          {t("settings.openInExplorer")}
        </button>
        <button type="button" onClick={relocate} className={secondaryBtn}>
          <FolderInput className="h-4 w-4" />
          {t("settings.changeLocation")}
        </button>
      </div>
    </div>
  );
}
