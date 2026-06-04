import { useTranslation } from "react-i18next";
import { useAssistantStore } from "../../stores/assistantStore";
import { Markdown } from "../paper/Markdown";

interface ConfirmationCardProps {
  id: string;
  content: string;
  resolved: boolean;
}

/**
 * Phase-1 card: the assistant has restated its understanding (plan) and waits
 * for the user to confirm before generating JSON. "Confirm" sends the generate
 * request; "Modify" simply dismisses so the user can type an adjustment.
 */
export function ConfirmationCard({ id, content, resolved }: ConfirmationCardProps) {
  const { t } = useTranslation();
  const confirm = useAssistantStore((s) => s.confirm);
  const dismiss = useAssistantStore((s) => s.dismissConfirmation);
  const streaming = useAssistantStore((s) => s.status === "streaming");

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-sm">
      <div className="text-slate-700">
        <Markdown>{content}</Markdown>
      </div>
      {!resolved && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={streaming}
            onClick={() => void confirm(id)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("assistant.confirmGenerate")}
          </button>
          <button
            type="button"
            disabled={streaming}
            onClick={() => dismiss(id)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-50"
          >
            {t("assistant.modify")}
          </button>
        </div>
      )}
    </div>
  );
}
