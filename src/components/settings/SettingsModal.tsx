import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Check,
  FolderKanban,
  Settings2,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { iconBtn } from "../../lib/ui/styles";
import { ModelConfigSection } from "./ModelConfigSection";
import { GeneralSection } from "./GeneralSection";
import { DataDirSection } from "./DataDirSection";

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = "models" | "general" | "data";

interface TabItem {
  id: Tab;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

const tabs: TabItem[] = [
  {
    id: "models",
    labelKey: "settings.modelConfigs",
    descriptionKey: "settings.modelConfigsDescription",
    icon: Bot,
  },
  {
    id: "general",
    labelKey: "settings.general",
    descriptionKey: "settings.generalDescription",
    icon: SlidersHorizontal,
  },
  {
    id: "data",
    labelKey: "settings.dataDirectory",
    descriptionKey: "settings.dataDirectoryDescription",
    icon: FolderKanban,
  },
];

/** Settings modal: model configs, general preferences, and data location. */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("models");
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.title")}
        className="flex h-[86vh] max-h-[42rem] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Settings2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {t("settings.title")}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("settings.cancel")}
            title={t("settings.cancel")}
            onClick={onClose}
            className={iconBtn}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] sm:grid-cols-[15rem_minmax(0,1fr)] sm:grid-rows-1">
          <nav
            aria-label={t("settings.title")}
            className="flex gap-1 overflow-x-auto border-b border-border bg-muted/35 p-2 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3"
          >
            {tabs.map((item) => (
              <TabButton
                key={item.id}
                item={item}
                active={tab === item.id}
                onClick={() => setTab(item.id)}
              />
            ))}
          </nav>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                  <ActiveIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(activeTab.labelKey)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t(activeTab.descriptionKey)}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-auto p-4 sm:p-6">
              {tab === "models" && <ModelConfigSection />}
              {tab === "general" && <GeneralSection />}
              {tab === "data" && <DataDirSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  item,
  active,
  onClick,
}: {
  item: TabItem;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex min-w-max items-center gap-2 rounded-md bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm ring-1 ring-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer sm:w-full sm:min-w-0"
          : "inline-flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer sm:w-full sm:min-w-0"
      }
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{t(item.labelKey)}</span>
      {active && <Check className="ml-auto hidden h-4 w-4 shrink-0 sm:block" />}
    </button>
  );
}
