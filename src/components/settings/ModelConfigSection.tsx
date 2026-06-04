import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../stores/configStore";
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
        <p className="text-slate-400">{t("assistant.noModel")}</p>
      )}

      <ul className="space-y-2">
        {config.configs.map((c) => {
          const active = c.id === config.activeConfigId;
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">
                  {c.name}
                  {active && (
                    <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                      {t("settings.active")}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {c.baseUrl} · {c.model}
                </p>
              </div>
              {!active && (
                <button
                  type="button"
                  onClick={() => void setActiveConfig(c.id)}
                  className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                >
                  {t("settings.setActive")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(c.id)}
                className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {t("paper.edit")}
              </button>
              <button
                type="button"
                onClick={() => void deleteConfig(c.id)}
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                {t("settings.delete")}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
      >
        + {t("settings.addConfig")}
      </button>
    </div>
  );
}
