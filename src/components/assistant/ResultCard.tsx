import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus, Undo2 } from "lucide-react";
import type { Question } from "../../lib/types/exam";
import { useAssistantStore } from "../../stores/assistantStore";
import { usePaperStore } from "../../stores/paperStore";
import { Markdown } from "../paper/Markdown";

interface ResultCardProps {
  id: string;
  prose: string;
  questions: Question[];
  applied: boolean;
}

/**
 * Phase-2 result: a collapsible preview of the questions the assistant
 * generated. Nothing touches the paper until the user clicks "apply"; after
 * applying, an "undo" reverses the single AI-apply via the paper store.
 */
export function ResultCard({ id, prose, questions, applied }: ResultCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const applyResult = useAssistantStore((s) => s.applyResult);
  const undoApply = usePaperStore((s) => s.undoApply);

  return (
    <div className="animate-fade-in rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
      {prose && (
        <div className="mb-2 text-muted-foreground">
          <Markdown>{prose}</Markdown>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md text-left font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <span>{t("assistant.generated", { count: questions.length })}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <ol className="mt-2 space-y-2 border-t border-border pt-2">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-md bg-muted px-2 py-1.5">
              <div className="flex items-baseline gap-2">
                <span className="select-none text-xs font-medium text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="rounded bg-secondary px-1.5 text-xs text-secondary-foreground">
                  {q.type}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {q.score}
                </span>
              </div>
              <div className="mt-1 min-w-0">
                <Markdown>{q.content}</Markdown>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex items-center gap-2">
        {applied ? (
          <>
            <span className="text-xs text-muted-foreground">
              {t("assistant.applied")}
            </span>
            <button
              type="button"
              onClick={() => undoApply()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <Undo2 className="h-4 w-4" />
              {t("assistant.undo")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => applyResult(id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t("assistant.applyToPaper")}
          </button>
        )}
      </div>
    </div>
  );
}
