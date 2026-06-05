import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Languages,
  LayoutTemplate,
  Palette,
  Save,
  Sparkles,
  Type,
} from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import {
  PAPER_FONT_OPTIONS,
  type ExplanationTier,
  type PaperFont,
  type Theme,
} from "../../lib/types/config";
import { inputCls } from "../../lib/ui/styles";

const selectCls = inputCls + " py-2 cursor-pointer";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent " +
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (checked ? "bg-primary" : "bg-input")
      }
    >
      <span
        className={
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform " +
          (checked ? "translate-x-4" : "translate-x-0")
        }
      />
    </button>
  );
}

/** Grouped general preferences: interface, paper layout, and AI generation. */
export function GeneralSection() {
  const { t } = useTranslation();
  const s = useConfigStore((state) => state.config.settings);
  const updateSettings = useConfigStore((state) => state.updateSettings);

  return (
    <div className="space-y-5 text-sm">
      <SettingsGroup
        icon={<LayoutTemplate className="h-4 w-4" />}
        title={t("settings.interfacePreferences")}
      >
        <SettingRow icon={<Languages className="h-4 w-4" />} label={t("settings.language")}>
          <select
            value={s.language}
            onChange={(e) => void updateSettings({ language: e.currentTarget.value as "zh" | "en" })}
            className={selectCls}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </SettingRow>

        <SettingRow icon={<Palette className="h-4 w-4" />} label={t("settings.theme")}>
          <select
            value={s.theme}
            onChange={(e) => void updateSettings({ theme: e.currentTarget.value as Theme })}
            className={selectCls}
          >
            <option value="system">{t("theme.system")}</option>
            <option value="light">{t("theme.light")}</option>
            <option value="dark">{t("theme.dark")}</option>
          </select>
        </SettingRow>

        <SettingRow icon={<Save className="h-4 w-4" />} label={t("settings.autoSave")}>
          <Toggle
            checked={s.autoSave}
            onChange={(v) => void updateSettings({ autoSave: v })}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup icon={<Type className="h-4 w-4" />} title={t("settings.paperLayout")}>
        <SettingRow icon={<Type className="h-4 w-4" />} label={t("settings.paperFont")}>
          <select
            value={s.paperFont}
            onChange={(e) => void updateSettings({ paperFont: e.currentTarget.value as PaperFont })}
            className={selectCls}
          >
            {PAPER_FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>{t(`paperFont.${font}`)}</option>
            ))}
          </select>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        icon={<Sparkles className="h-4 w-4" />}
        title={t("settings.aiGenerationPreferences")}
      >
        <SettingRow icon={<Sparkles className="h-4 w-4" />} label={t("settings.explanationTier")}>
          <select
            value={s.explanationTier}
            onChange={(e) => void updateSettings({ explanationTier: e.currentTarget.value as ExplanationTier })}
            className={selectCls}
          >
            <option value="none">{t("explanationTier.none")}</option>
            <option value="brief">{t("explanationTier.brief")}</option>
            <option value="detailed">{t("explanationTier.detailed")}</option>
          </select>
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <h4>{title}</h4>
      </div>
      <div className="overflow-hidden rounded-md border border-border divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-3 bg-background px-4 py-3 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] sm:items-center">
      <span className="inline-flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
      <span className="flex min-w-0 justify-start sm:justify-end">{children}</span>
    </label>
  );
}
