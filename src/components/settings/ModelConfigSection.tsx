import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, Server, Link2 } from "lucide-react";
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
    <div className="flex min-h-[24rem] flex-col space-y-3 text-sm">
      {config.configs.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
          <Server className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">
            {t("assistant.noModel")}
          </p>
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
                  ? "flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3"
                  : "flex items-center gap-3 rounded-md border border-border bg-background px-3 py-3 transition-colors hover:bg-accent/60"
              }
            >
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground sm:inline-flex">
                <Server className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium text-foreground">
                  {c.name}
                  {active && (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      <Check className="h-3.5 w-3.5" />
                      {t("settings.active")}
                    </span>
                  )}
                </p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {c.baseUrl} · {c.model}
                  </span>
                </p>
              </div>
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
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className={primaryBtn + " mt-auto sm:mt-1"}
      >
        <Plus className="h-4 w-4" />
        {t("settings.addConfig")}
      </button>
    </div>
  );
}
