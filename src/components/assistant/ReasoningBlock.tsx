import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrainCircuit, ChevronDown, ChevronRight } from "lucide-react";
import { Markdown } from "../paper/Markdown";

interface ReasoningBlockProps {
  content?: string;
  streaming?: boolean;
}

/** Compact collapsible rendering for provider-returned reasoning content. */
export function ReasoningBlock({ content, streaming = false }: ReasoningBlockProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const text = content?.trim();
  if (!text) return null;

  const label = streaming
    ? t("assistant.reasoningThinking")
    : t("assistant.reasoningTitle");
  const ariaLabel = open
    ? t("assistant.collapseReasoning")
    : t("assistant.expandReasoning");

  return (
    <div className="mb-2 rounded-xl border border-border/70 bg-muted/45 text-xs text-muted-foreground">
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-primary/80" />
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        {streaming && (
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
        )}
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {open && (
        <div className="max-h-52 overflow-auto border-t border-border/50 px-2.5 py-2 text-[12px] leading-5 text-muted-foreground">
          <Markdown variant="compact">{text}</Markdown>
        </div>
      )}
    </div>
  );
}
