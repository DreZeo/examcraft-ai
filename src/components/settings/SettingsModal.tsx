import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModelConfigSection } from "./ModelConfigSection";
import { GeneralSection } from "./GeneralSection";
import { DataDirSection } from "./DataDirSection";

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = "models" | "general" | "data";

/** Settings modal: model configs, general preferences, and data location. */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("models");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.title")}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">
            {t("settings.title")}
          </h2>
          <button
            type="button"
            aria-label={t("settings.cancel")}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-3 py-2 text-sm">
          <TabButton active={tab === "models"} onClick={() => setTab("models")}>
            {t("settings.modelConfigs")}
          </TabButton>
          <TabButton
            active={tab === "general"}
            onClick={() => setTab("general")}
          >
            {t("settings.general")}
          </TabButton>
          <TabButton active={tab === "data"} onClick={() => setTab("data")}>
            {t("settings.dataDirectory")}
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {tab === "models" && <ModelConfigSection />}
          {tab === "general" && <GeneralSection />}
          {tab === "data" && <DataDirSection />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700"
          : "rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
      }
    >
      {children}
    </button>
  );
}
