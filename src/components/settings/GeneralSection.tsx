import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../stores/configStore";
import type { ExplanationTier } from "../../lib/types/config";

/** General preferences: language, auto-save, explanation tier, custom instructions. */
export function GeneralSection() {
  const { t } = useTranslation();
  const { config, updateSettings } = useConfigStore();
  const s = config.settings;

  return (
    <div className="space-y-5 text-sm">
      <label className="flex items-center justify-between">
        <span className="font-medium text-slate-700">
          {t("settings.language")}
        </span>
        <select
          value={s.language}
          onChange={(e) =>
            void updateSettings({
              language: e.currentTarget.value as "zh" | "en",
            })
          }
          className="rounded-md border border-slate-300 px-2 py-1"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </label>

      <label className="flex items-center justify-between">
        <span className="font-medium text-slate-700">
          {t("settings.autoSave")}
        </span>
        <input
          type="checkbox"
          checked={s.autoSave}
          onChange={(e) =>
            void updateSettings({ autoSave: e.currentTarget.checked })
          }
          className="h-4 w-4"
        />
      </label>

      <label className="flex items-center justify-between">
        <span className="font-medium text-slate-700">
          {t("settings.explanationTier")}
        </span>
        <select
          value={s.explanationTier}
          onChange={(e) =>
            void updateSettings({
              explanationTier: e.currentTarget.value as ExplanationTier,
            })
          }
          className="rounded-md border border-slate-300 px-2 py-1"
        >
          <option value="none">{t("explanationTier.none")}</option>
          <option value="brief">{t("explanationTier.brief")}</option>
          <option value="detailed">{t("explanationTier.detailed")}</option>
        </select>
      </label>

      <div>
        <label
          htmlFor="custom-instructions"
          className="font-medium text-slate-700"
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
          className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
