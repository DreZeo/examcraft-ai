import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../stores/configStore";
import { getApiKey } from "../../lib/storage/tauri";

interface ModelConfigFormProps {
  /** Existing config id to edit, or null to add a new one. */
  configId: string | null;
  onDone: () => void;
}

/** Add/edit form for a single OpenAI-compatible model config. */
export function ModelConfigForm({ configId, onDone }: ModelConfigFormProps) {
  const { t } = useTranslation();
  const { config, addConfig, updateConfig } = useConfigStore();
  const existing = config.configs.find((c) => c.id === configId) ?? null;

  const [name, setName] = useState(existing?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(
    existing?.temperature?.toString() ?? "",
  );
  const [maxTokens, setMaxTokens] = useState(
    existing?.maxTokens?.toString() ?? "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (configId) void getApiKey(configId).then((k) => setKeyConfigured(!!k));
  }, [configId]);

  const canSave =
    name.trim() && baseUrl.trim() && model.trim() && (existing || apiKey);

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      const advanced = {
        temperature: temperature ? Number(temperature) : undefined,
        maxTokens: maxTokens ? Number(maxTokens) : undefined,
      };
      if (existing) {
        await updateConfig(
          existing.id,
          { name, baseUrl, model, ...advanced },
          apiKey || undefined,
        );
      } else {
        await addConfig({ name, baseUrl, model, ...advanced }, apiKey);
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <Field label={t("settings.name")}>
        <input value={name} onChange={(e) => setName(e.currentTarget.value)} className={inputCls} />
      </Field>
      <Field label={t("settings.baseUrl")}>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.currentTarget.value)}
          placeholder="https://api.openai.com/v1"
          className={inputCls}
        />
      </Field>
      <Field label={t("settings.model")}>
        <input value={model} onChange={(e) => setModel(e.currentTarget.value)} placeholder="gpt-4o" className={inputCls} />
      </Field>
      <Field label={t("settings.apiKey")}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          placeholder={keyConfigured ? "••••••• " + t("settings.apiKeyConfigured") : ""}
          className={inputCls}
        />
      </Field>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        {showAdvanced ? "▾" : "▸"} {t("settings.advanced")}
      </button>
      {showAdvanced && (
        <div className="space-y-3 rounded-md bg-slate-50 p-3">
          <Field label={t("settings.temperature")}>
            <input
              value={temperature}
              onChange={(e) => setTemperature(e.currentTarget.value)}
              placeholder="0.7"
              className={inputCls}
            />
          </Field>
          <Field label={t("settings.maxTokens")}>
            <input
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.currentTarget.value)}
              placeholder="4096"
              className={inputCls}
            />
          </Field>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("settings.cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave || busy}
          className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("settings.save")}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
