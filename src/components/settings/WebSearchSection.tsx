import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlaskConical,
  KeyRound,
  Loader2,
  Radar,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { useConfigStore } from "../../stores/configStore";
import {
  WEB_SEARCH_CONTENT_MODES,
  WEB_SEARCH_PROVIDERS,
  type WebSearchContentMode,
  type WebSearchProvider,
} from "../../lib/types/config";
import { inputCls, secondaryBtn } from "../../lib/ui/styles";
import { testWebSearch } from "../../lib/storage/tauri";
import { SelectControl } from "../ui/SelectControl";
import { SecretInput } from "../ui/SecretInput";

/** Dedicated web-search provider settings for assistant browsing context. */
export function WebSearchSection() {
  const { t } = useTranslation();
  const settings = useConfigStore((s) => s.config.settings.webSearch);
  const updateSettings = useConfigStore((s) => s.updateSettings);

  return (
    <div className="space-y-5 text-sm">
      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <h4>{t("webSearch.behavior")}</h4>
        </div>
        <div className="rounded-md border border-border divide-y divide-border">
          <SettingRow icon={<Search className="h-4 w-4" />} label={t("webSearch.activeProvider")}>
            <SelectControl
              icon={<Search className="h-3.5 w-3.5" />}
              label={t("webSearch.activeProvider")}
              value={settings.activeProvider}
              options={WEB_SEARCH_PROVIDERS}
              optionKeyPrefix="webSearch.provider"
              onChange={(activeProvider) => void updateSettings({ webSearch: { ...settings, activeProvider } })}
            />
          </SettingRow>
          <SettingRow icon={<Radar className="h-4 w-4" />} label={t("webSearch.contentMode")}>
            <SelectControl
              icon={<Radar className="h-3.5 w-3.5" />}
              label={t("webSearch.contentMode")}
              value={settings.contentMode}
              options={WEB_SEARCH_CONTENT_MODES}
              optionKeyPrefix="webSearch.contentModeOption"
              onChange={(contentMode) => void updateSettings({ webSearch: { ...settings, contentMode } })}
            />
          </SettingRow>
          <SettingRow icon={<SlidersHorizontal className="h-4 w-4" />} label={t("webSearch.resultCount")}>
            <input
              type="number"
              min={3}
              max={10}
              value={settings.resultCount}
              onChange={(e) => {
                const value = Number(e.currentTarget.value);
                const resultCount = Number.isFinite(value)
                  ? Math.min(10, Math.max(3, Math.round(value)))
                  : settings.resultCount;
                void updateSettings({ webSearch: { ...settings, resultCount } });
              }}
              className={`${inputCls} h-8 max-w-24 py-1 text-xs`}
            />
          </SettingRow>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">
            <KeyRound className="h-4 w-4" />
          </span>
          <h4>{t("webSearch.providers")}</h4>
        </div>
        <div className="space-y-3">
          {WEB_SEARCH_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider}
              provider={provider}
              contentMode={settings.contentMode}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProviderCard({
  provider,
  contentMode,
}: {
  provider: WebSearchProvider;
  contentMode: WebSearchContentMode;
}) {
  const { t } = useTranslation();
  const getWebSearchApiKey = useConfigStore((s) => s.getWebSearchApiKey);
  const updateWebSearchApiKey = useConfigStore((s) => s.updateWebSearchApiKey);
  const [apiKey, setApiKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    void getWebSearchApiKey(provider).then((key) => {
      setKeyConfigured(!!key);
      setApiKey(key ?? "");
    });
  }, [getWebSearchApiKey, provider]);

  async function resolveKey(): Promise<string | null> {
    if (apiKey.trim()) return apiKey.trim();
    return getWebSearchApiKey(provider);
  }

  async function saveKey() {
    const key = apiKey.trim();
    if (!key) return;
    setBusy(true);
    setStatus(null);
    try {
      await updateWebSearchApiKey(provider, key);
      setKeyConfigured(true);
      setStatus({ kind: "ok", text: t("webSearch.keySaved") });
    } catch {
      setStatus({ kind: "error", text: t("webSearch.keySaveFailed") });
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    const key = await resolveKey();
    if (!key) {
      setStatus({ kind: "error", text: t("webSearch.enterApiKey") });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await testWebSearch({ provider, apiKey: key, contentMode });
      setStatus({ kind: "ok", text: t("settings.connectionOk") });
    } catch {
      setStatus({ kind: "error", text: t("settings.connectionFailed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {t(`webSearch.provider.${provider}`)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(`webSearch.providerDescription.${provider}`)}
          </p>
        </div>
        {keyConfigured && (
          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {t("settings.apiKeyConfigured")}
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <SecretInput
          value={apiKey}
          onChange={setApiKey}
          placeholder={keyConfigured ? "" : t("settings.apiKey")}
        />
        <button
          type="button"
          onClick={() => void saveKey()}
          disabled={busy || !apiKey.trim()}
          className={secondaryBtn}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("settings.save")}
        </button>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={busy}
          className={secondaryBtn}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4" />
          )}
          {t("settings.testConnection")}
        </button>
      </div>
      {status && (
        <p
          className={
            status.kind === "ok"
              ? "mt-2 text-xs text-emerald-600 dark:text-emerald-400"
              : "mt-2 text-xs text-destructive"
          }
        >
          {status.text}
        </p>
      )}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 bg-background px-4 py-3 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] sm:items-center">
      <span className="inline-flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
      <span className="flex min-w-0 justify-start sm:justify-end">{children}</span>
    </div>
  );
}
