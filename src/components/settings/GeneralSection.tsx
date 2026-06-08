import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Languages,
  LayoutTemplate,
  MessageSquare,
  Palette,
  SeparatorHorizontal,
  Save,
  Sparkles,
  Type,
} from "lucide-react";

import { useConfigStore } from "../../stores/configStore";
import {
  GLOBAL_FONT_OPTIONS,
  type ExplanationTier,
  type GlobalFont,
  type Theme,
} from "../../lib/types/config";
import { SelectControl } from "../ui/SelectControl";

const LANGUAGES = ["zh", "en"] as const;
const THEMES = ["system", "light", "dark"] as const;
const EXPLANATION_TIERS = ["none", "brief", "detailed"] as const;
const GLOBAL_FONTS = GLOBAL_FONT_OPTIONS;

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
          <SelectControl
            icon={<Languages className="h-3.5 w-3.5" />}
            label={t("settings.language")}
            value={s.language}
            options={LANGUAGES}
            optionKeyPrefix="language"
            onChange={(v) => void updateSettings({ language: v })}
          />
        </SettingRow>

        <SettingRow icon={<Palette className="h-4 w-4" />} label={t("settings.theme")}>
          <SelectControl
            icon={<Palette className="h-3.5 w-3.5" />}
            label={t("settings.theme")}
            value={s.theme}
            options={THEMES}
            optionKeyPrefix="theme"
            onChange={(v) => void updateSettings({ theme: v as Theme })}
          />
        </SettingRow>

        <SettingRow icon={<Type className="h-4 w-4" />} label={t("settings.globalFont")}>
          <SelectControl
            icon={<Type className="h-3.5 w-3.5" />}
            label={t("settings.globalFont")}
            value={s.globalFont}
            options={GLOBAL_FONTS}
            optionKeyPrefix="globalFont"
            onChange={(v) => void updateSettings({ globalFont: v as GlobalFont })}
          />
        </SettingRow>

        <SettingRow icon={<Save className="h-4 w-4" />} label={t("settings.autoSave")}>
          <Toggle
            checked={s.autoSave}
            onChange={(v) => void updateSettings({ autoSave: v })}
          />
        </SettingRow>

        <SettingRow
          icon={<SeparatorHorizontal className="h-4 w-4" />}
          label={t("settings.paperHeaderFooterLine")}
        >
          <Toggle
            checked={s.paperHeaderFooterLine}
            onChange={(v) => void updateSettings({ paperHeaderFooterLine: v })}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        icon={<Sparkles className="h-4 w-4" />}
        title={t("settings.aiGenerationPreferences")}
      >
        <SettingRow icon={<Sparkles className="h-4 w-4" />} label={t("settings.explanationTier")}>
          <SelectControl
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label={t("settings.explanationTier")}
            value={s.explanationTier}
            options={EXPLANATION_TIERS}
            optionKeyPrefix="explanationTier"
            onChange={(v) => void updateSettings({ explanationTier: v as ExplanationTier })}
          />
        </SettingRow>

        <SettingRow
          icon={<MessageSquare className="h-4 w-4" />}
          label={t("settings.contextMessageLimit")}
          description={t("settings.contextMessageLimitDescription")}
        >
          <input
            type="number"
            min={0}
            max={200}
            value={s.contextMessageLimit}
            onChange={(e) => {
              const v = Math.min(200, Math.max(0, parseInt(e.target.value, 10) || 0));
              void updateSettings({ contextMessageLimit: v });
            }}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("settings.contextMessageLimit")}
          />
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
      <div className="rounded-md border border-border divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 bg-background px-4 py-3 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] sm:items-center">
      <span className="inline-flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>
          <span className="font-medium">{label}</span>
          {description && (
            <span className="block text-xs text-muted-foreground">{description}</span>
          )}
        </span>
      </span>
      <span className="flex min-w-0 justify-start sm:justify-end">{children}</span>
    </div>
  );
}
