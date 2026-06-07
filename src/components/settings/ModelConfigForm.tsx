import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
  RefreshCw,
  FlaskConical,
  Loader2,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Network,
  Server,
  SlidersHorizontal,
} from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import { getApiKey } from "../../lib/storage/tauri";
import { primaryBtn, secondaryBtn, inputCls } from "../../lib/ui/styles";
import { SecretInput } from "../ui/SecretInput";

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
  const [models, setModels] = useState<string[]>([]);
  const [probing, setProbing] = useState(false);
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!configId) return;
    void getApiKey(configId).then((key) => {
      setKeyConfigured(!!key);
      setApiKey(key ?? "");
    });
  }, [configId]);

  /** Resolve the key to probe with: a freshly typed one, else the stored one. */
  async function resolveKey(): Promise<string | null> {
    if (apiKey) return apiKey;
    if (configId) return getApiKey(configId);
    return null;
  }

  async function fetchModels() {
    setStatus(null);
    const key = await resolveKey();
    if (!baseUrl.trim() || !key) {
      setStatus({ kind: "error", text: t("settings.enterUrlAndKey") });
      return;
    }
    setProbing(true);
    try {
      const list = await invoke<string[]>("list_models", {
        baseUrl,
        apiKey: key,
      });
      setModels(list);
      if (list.length > 0 && !model) setModel(list[0]);
    } catch {
      setStatus({ kind: "error", text: t("settings.fetchModelsFailed") });
    } finally {
      setProbing(false);
    }
  }

  async function testConnection() {
    setStatus(null);
    const key = await resolveKey();
    if (!baseUrl.trim() || !key) {
      setStatus({ kind: "error", text: t("settings.enterUrlAndKey") });
      return;
    }
    setProbing(true);
    try {
      await invoke("test_connection", { baseUrl, apiKey: key });
      setStatus({ kind: "ok", text: t("settings.connectionOk") });
    } catch {
      setStatus({ kind: "error", text: t("settings.connectionFailed") });
    } finally {
      setProbing(false);
    }
  }

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
    <div className="space-y-4 text-sm">
      <FormPanel
        icon={<Server className="h-4 w-4" />}
        title={t("settings.modelConfigBasic")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("settings.name")}>
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              className={inputCls}
            />
          </Field>
          <Field label={t("settings.model")}>
            {models.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
                className={inputCls}
              >
                {!models.includes(model) && model && (
                  <option value={model}>{model}</option>
                )}
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
                placeholder="gpt-4o"
                className={inputCls}
              />
            )}
          </Field>
        </div>
        <Field label={t("settings.baseUrl")}>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.currentTarget.value)}
            placeholder="https://api.openai.com/v1"
            className={inputCls}
          />
        </Field>
      </FormPanel>

      <FormPanel
        icon={<KeyRound className="h-4 w-4" />}
        title={t("settings.modelConfigCredential")}
      >
        <Field label={t("settings.apiKey")}>
          <SecretInput
            value={apiKey}
            onChange={setApiKey}
            placeholder={keyConfigured ? "" : t("settings.apiKey")}
          />
        </Field>
      </FormPanel>

      <FormPanel
        icon={<Network className="h-4 w-4" />}
        title={t("settings.modelConfigConnection")}
      >
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            {t("settings.modelConfigConnectionHint")}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchModels()}
              disabled={probing}
              className={smallBtn}
            >
              {probing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t("settings.fetchModels")}
            </button>
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={probing}
              className={smallBtn}
            >
              {probing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              {t("settings.testConnection")}
            </button>
          </div>
        </div>
        {status && (
          <p
            className={
              status.kind === "ok"
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            }
          >
            {status.text}
          </p>
        )}
      </FormPanel>

      <div className="rounded-md border border-border bg-background">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md cursor-pointer"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <SlidersHorizontal className="h-4 w-4" />
          {t("settings.advanced")}
        </button>
        {showAdvanced && (
          <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
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
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button type="button" onClick={onDone} className={secondaryBtn}>
          {t("settings.cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave || busy}
          className={primaryBtn}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("settings.save")}
        </button>
      </div>
    </div>
  );
}

const smallBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent " +
  "px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent " +
  "hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

function FormPanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-muted/30">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
