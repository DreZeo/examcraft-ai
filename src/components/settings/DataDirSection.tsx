import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import {
  AlertTriangle,
  FolderOpen,
  FolderInput,
  HardDrive,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import {
  defaultDataDir,
  openDataDir as openDataDirInFileManager,
} from "../../lib/storage/tauri";
import { useConfigStore } from "../../stores/configStore";
import { primaryBtn, secondaryBtn } from "../../lib/ui/styles";

/** Data location: show current path, open in file manager, relocate. */
export function DataDirSection() {
  const { t } = useTranslation();
  const dataDir = useConfigStore((state) => state.dataDir);
  const chooseDataDir = useConfigStore((state) => state.chooseDataDir);
  const [openError, setOpenError] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [relocateError, setRelocateError] = useState(false);
  const [cleanupWarning, setCleanupWarning] = useState(false);
  const [isRelocating, setIsRelocating] = useState(false);
  const [deleteOldDir, setDeleteOldDir] = useState(false);
  const [pendingDefaultDir, setPendingDefaultDir] = useState<string | null>(null);

  async function relocateTo(targetDir: string) {
    setIsRelocating(true);
    setRelocateError(false);
    setCleanupWarning(false);
    try {
      const result = await chooseDataDir(targetDir, { deleteOldDir });
      setCleanupWarning(result.oldDirDeleteFailed);
    } catch (error) {
      console.error("Failed to relocate data directory", error);
      setRelocateError(true);
    } finally {
      setIsRelocating(false);
    }
  }

  async function relocate() {
    if (isRelocating) return;
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected !== "string") return;
    await relocateTo(selected);
  }

  async function restoreDefaultLocation() {
    if (isRelocating) return;
    try {
      const targetDir = await defaultDataDir();
      setPendingDefaultDir(targetDir);
    } catch (error) {
      console.error("Failed to relocate data directory", error);
      setRelocateError(true);
    }
  }

  async function confirmRestoreDefaultLocation() {
    if (!pendingDefaultDir) return;
    const targetDir = pendingDefaultDir;
    setPendingDefaultDir(null);
    await relocateTo(targetDir);
  }

  async function openDataDir() {
    if (!dataDir || isOpening || isRelocating) return;
    setIsOpening(true);
    setOpenError(false);
    try {
      await openDataDirInFileManager(dataDir);
    } catch (error) {
      console.error("Failed to open data directory", error);
      setOpenError(true);
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="flex min-h-[24rem] flex-col gap-3 text-sm">
      <div className="rounded-md border border-border bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="font-medium text-foreground">
              {t("settings.dataDirectory")}
            </p>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {dataDir ?? "—"}
          </p>
        </div>
        {openError && (
          <p
            className="mx-4 mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="status"
          >
            {t("settings.openDataDirectoryFailed")}
          </p>
        )}
        {relocateError && (
          <p
            className="mx-4 mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="status"
          >
            {t("settings.relocateDataDirectoryFailed")}
          </p>
        )}
        {cleanupWarning && (
          <p
            className="mx-4 mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
            role="status"
          >
            {t("settings.deleteOldDataDirectoryFailed")}
          </p>
        )}
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block font-medium text-foreground">
              {t("settings.deleteOldDataDirectory")}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {t("settings.deleteOldDataDirectoryDescription")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={deleteOldDir}
            disabled={isRelocating}
            onChange={(event) => setDeleteOldDir(event.currentTarget.checked)}
            className="h-4 w-4 shrink-0 accent-primary"
          />
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!dataDir || isOpening || isRelocating}
            onClick={openDataDir}
            className={secondaryBtn}
          >
            <FolderOpen className="h-4 w-4" />
            {t("settings.openInExplorer")}
          </button>
          <button
            type="button"
            disabled={isRelocating}
            onClick={relocate}
            className={secondaryBtn}
          >
            {isRelocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="h-4 w-4" />
            )}
            {isRelocating
              ? t("settings.relocatingDataDirectory")
              : t("settings.changeLocation")}
          </button>
          <button
            type="button"
            disabled={isRelocating}
            onClick={restoreDefaultLocation}
            className={secondaryBtn}
          >
            <RotateCcw className="h-4 w-4" />
            {t("settings.restoreDefaultDataDirectory")}
          </button>
        </div>
      </div>

      {pendingDefaultDir && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
          role="presentation"
          onClick={() => setPendingDefaultDir(null)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border bg-card text-card-foreground shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-default-data-dir-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3
                  id="restore-default-data-dir-title"
                  className="font-medium text-foreground"
                >
                  {t("settings.restoreDefaultDataDirectory")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.restoreDefaultDataDirectoryPrompt")}
                </p>
              </div>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                {pendingDefaultDir}
              </p>
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                {t("settings.restoreDefaultDataDirectoryOverwrite")}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => setPendingDefaultDir(null)}
              >
                {t("settings.cancel")}
              </button>
              <button
                type="button"
                className={primaryBtn}
                onClick={confirmRestoreDefaultLocation}
              >
                {t("settings.confirmRestoreDefaultDataDirectory")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
