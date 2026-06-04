import { useTranslation } from "react-i18next";
import {
  Languages,
  MessageSquareText,
  Palette,
  Save,
  Sparkles,
} from "lucide-react";
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
    <div className="min-h-[24rem] space-y-5 text-sm">
      <label className={rowCls}>
        <span className={labelCls}>
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {t("settings.language")}
          </span>
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

      <label className={rowCls}>
        <span className={labelCls}>
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {t("settings.theme")}
          </span>
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

      <label className={rowCls}>
        <span className={labelCls}>
          <Save className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {t("settings.autoSave")}
          </span>
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

      <label className={rowCls}>
        <span className={labelCls}>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {t("settings.explanationTier")}
          </span>
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

      <div className="rounded-md border border-border bg-background p-3">
        <label
          htmlFor="custom-instructions"
          className="flex items-center gap-2 font-medium text-foreground"
        >
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
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

const rowCls =
  "flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between";
const labelCls = "inline-flex items-center gap-2";
