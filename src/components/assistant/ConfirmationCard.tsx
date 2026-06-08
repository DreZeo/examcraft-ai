import { useTranslation } from "react-i18next";
import { Check, Pencil } from "lucide-react";
import { useAssistantStore } from "../../stores/assistantStore";
import { Markdown } from "../paper/Markdown";
import { ReasoningBlock } from "./ReasoningBlock";

interface ConfirmationCardProps {
  id: string;
  content: string;
  reasoning?: string;
  resolved: boolean;
}

/**
 * Phase-1 card: the assistant has restated its understanding (plan) and waits
 * for the user to confirm before generating JSON. "Confirm" sends the generate
 * request; "Modify" simply dismisses so the user can type an adjustment.
 */
export function ConfirmationCard({
  id,
  content,
  reasoning,
  resolved,
}: ConfirmationCardProps) {
  const { t } = useTranslation();
  const confirm = useAssistantStore((s) => s.confirm);
  const dismiss = useAssistantStore((s) => s.dismissConfirmation);
  const streaming = useAssistantStore((s) => s.status === "streaming");

  return (
    <div className="animate-fade-in rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.08] to-primary/[0.04] p-4 text-sm shadow-sm">
      <ReasoningBlock content={reasoning} />
      <div className="text-foreground">
        <Markdown>{content}</Markdown>
      </div>
      {!resolved && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={streaming}
            onClick={() => void confirm(id)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-shadow hover:shadow-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            {t("assistant.confirmGenerate")}
          </button>
          <button
            type="button"
            disabled={streaming}
            onClick={() => dismiss(id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            {t("assistant.modify")}
          </button>
        </div>
      )}
    </div>
  );
}
