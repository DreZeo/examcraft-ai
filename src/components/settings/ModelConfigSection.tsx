import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, Server, Link2, Cpu } from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import { primaryBtn } from "../../lib/ui/styles";
import { ModelConfigForm } from "./ModelConfigForm";

/** Multi-config list with active selection, add, edit, and delete. */
export function ModelConfigSection() {
  const { t } = useTranslation();
  const { config, setActiveConfig, deleteConfig } = useConfigStore();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  if (editing) {
    return (
      <ModelConfigForm
        configId={editing === "new" ? null : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex min-h-[24rem] flex-col gap-3 text-sm">
      {config.configs.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
            <Server className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("assistant.noModel")}
          </p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            {t("settings.modelConfigEmptyHint")}
          </p>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={primaryBtn + " mt-4"}
          >
            <Plus className="h-4 w-4" />
            {t("settings.addConfig")}
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {config.configs.map((c) => {
          const active = c.id === config.activeConfigId;
          return (
            <li
              key={c.id}
              className={
                active
                  ? "rounded-md border border-primary/30 bg-primary/5 px-3 py-3"
                  : "rounded-md border border-border bg-background px-3 py-3 transition-colors hover:bg-accent/50"
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground sm:inline-flex">
                  <Server className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {c.name}
                    </p>
                    {active && (
                      <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                        <Check className="h-3.5 w-3.5" />
                        {t("settings.active")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Cpu className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.model}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Link2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.baseUrl}</span>
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  {!active && (
                    <button
                      type="button"
                      onClick={() => void setActiveConfig(c.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      {t("settings.setActive")}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t("paper.edit")}
                    title={t("paper.edit")}
                    onClick={() => setEditing(c.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("settings.delete")}
                    title={t("settings.delete")}
                    onClick={() => void deleteConfig(c.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {config.configs.length > 0 && (
        <div className="mt-auto flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={primaryBtn}
          >
            <Plus className="h-4 w-4" />
            {t("settings.addConfig")}
          </button>
        </div>
      )}
    </div>
  );
}
