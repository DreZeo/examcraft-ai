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

/** Grouped general preferences: interface, paper layout, and AI generation. */
export function GeneralSection() {
  const { t } = useTranslation();
  const s = useConfigStore((state) => state.config.settings);
  const updateSettings = useConfigStore((state) => state.updateSettings);

  return (
    <div className="min-h-[24rem] space-y-6 text-sm">
      <SettingsGroup
        icon={<LayoutTemplate className="h-4 w-4" />}
        title={t("settings.interfacePreferences")}
      >
        <SettingRow
          icon={<Languages className="h-4 w-4" />}
          label={t("settings.language")}
        >
          <select
            value={s.language}
            onChange={(e) =>
              void updateSettings({
                language: e.currentTarget.value as "zh" | "en",
              })
            }
            className={selectCls}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </SettingRow>

        <SettingRow icon={<Palette className="h-4 w-4" />} label={t("settings.theme")}>
          <select
            value={s.theme}
            onChange={(e) =>
              void updateSettings({ theme: e.currentTarget.value as Theme })
            }
            className={selectCls}
          >
            <option value="system">{t("theme.system")}</option>
            <option value="light">{t("theme.light")}</option>
            <option value="dark">{t("theme.dark")}</option>
          </select>
        </SettingRow>

        <SettingRow icon={<Save className="h-4 w-4" />} label={t("settings.autoSave")}>
          <input
            type="checkbox"
            checked={s.autoSave}
            onChange={(e) =>
              void updateSettings({ autoSave: e.currentTarget.checked })
            }
            className="h-4 w-4 accent-primary cursor-pointer"
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        icon={<Type className="h-4 w-4" />}
        title={t("settings.paperLayout")}
      >
        <SettingRow icon={<Type className="h-4 w-4" />} label={t("settings.paperFont")}>
          <select
            value={s.paperFont}
            onChange={(e) =>
              void updateSettings({
                paperFont: e.currentTarget.value as PaperFont,
              })
            }
            className={selectCls}
          >
            {PAPER_FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {t(`paperFont.${font}`)}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        icon={<Sparkles className="h-4 w-4" />}
        title={t("settings.aiGenerationPreferences")}
      >
        <SettingRow
          icon={<Sparkles className="h-4 w-4" />}
          label={t("settings.explanationTier")}
        >
          <select
            value={s.explanationTier}
            onChange={(e) =>
              void updateSettings({
                explanationTier: e.currentTarget.value as ExplanationTier,
              })
            }
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
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        {icon}
        <h4>{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
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
    <label className="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] sm:items-center">
      <span className="inline-flex items-center gap-2 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
      <span className="flex min-w-0 justify-start sm:justify-end">{children}</span>
    </label>
  );
}
