import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
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
    <div className="space-y-3 text-sm">
      {config.configs.length === 0 && (
        <p className="text-muted-foreground">{t("assistant.noModel")}</p>
      )}

      <ul className="space-y-2">
        {config.configs.map((c) => {
          const active = c.id === config.activeConfigId;
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
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
                <p className="truncate text-xs text-muted-foreground">
                  {c.baseUrl} · {c.model}
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
        className={primaryBtn}
      >
        <Plus className="h-4 w-4" />
        {t("settings.addConfig")}
      </button>
    </div>
  );
}
