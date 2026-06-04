import { useTranslation } from "react-i18next";
import { Check, Pencil } from "lucide-react";
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
    <div className="animate-fade-in rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="text-foreground">
        <Markdown>{content}</Markdown>
      </div>
      {!resolved && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={streaming}
            onClick={() => void confirm(id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            {t("assistant.confirmGenerate")}
          </button>
          <button
            type="button"
            disabled={streaming}
            onClick={() => dismiss(id)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            {t("assistant.modify")}
          </button>
        </div>
      )}
    </div>
  );
}
