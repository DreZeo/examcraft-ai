import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../stores/configStore";
import type { ExplanationTier, Theme } from "../../lib/types/config";
import { inputCls } from "../../lib/ui/styles";

const selectCls = inputCls + " w-auto py-1.5 cursor-pointer";

/** General preferences: language, theme, auto-save, explanation tier, custom instructions. */
export function GeneralSection() {
  const { t } = useTranslation();
  const { config, updateSettings } = useConfigStore();
  const s = config.settings;

  return (
    <div className="space-y-5 text-sm">
      <label className="flex items-center justify-between gap-4">
        <span className="font-medium text-foreground">
          {t("settings.language")}
        </span>
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
      </label>

      <label className="flex items-center justify-between gap-4">
        <span className="font-medium text-foreground">
          {t("settings.theme")}
        </span>
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
      </label>

      <label className="flex items-center justify-between gap-4">
        <span className="font-medium text-foreground">
          {t("settings.autoSave")}
        </span>
        <input
          type="checkbox"
          checked={s.autoSave}
          onChange={(e) =>
            void updateSettings({ autoSave: e.currentTarget.checked })
          }
          className="h-4 w-4 accent-primary cursor-pointer"
        />
      </label>

      <label className="flex items-center justify-between gap-4">
        <span className="font-medium text-foreground">
          {t("settings.explanationTier")}
        </span>
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
      </label>

      <div>
        <label
          htmlFor="custom-instructions"
          className="font-medium text-foreground"
        >
          {t("settings.customInstructions")}
        </label>
        <textarea
          id="custom-instructions"
          rows={4}
          value={s.customInstructions}
          onChange={(e) =>
            void updateSettings({ customInstructions: e.currentTarget.value })
          }
          className={inputCls + " mt-1 resize-none"}
        />
      </div>
    </div>
  );
}
