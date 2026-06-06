import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import type { AiPaperOperation, Question } from "../../lib/types/exam";
import {
  countPaperOperationChanges,
  previewPaperOperations,
} from "../../lib/exam/operationPreview";
import { useAssistantStore } from "../../stores/assistantStore";
import { usePaperStore } from "../../stores/paperStore";
import { Markdown } from "../paper/Markdown";

interface ResultCardProps {
  id: string;
  prose: string;
  operations: AiPaperOperation[];
  questions?: Question[];
  applied: boolean;
}

/** Preview validated AI paper operations and apply them only on user action. */
export function ResultCard({
  id,
  prose,
  operations,
  questions,
  applied,
}: ResultCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const applyResult = useAssistantStore((s) => s.applyResult);
  const undoApply = usePaperStore((s) => s.undoApply);
  const summary = previewPaperOperations(operations, questions);
  const totalChanges = countPaperOperationChanges(summary);

  return (
    <div className="animate-fade-in rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm transition-shadow hover:shadow-md">
      {prose && (
        <div className="mb-2 text-muted-foreground">
          <Markdown>{prose}</Markdown>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl text-left font-medium text-foreground transition-colors hover:bg-accent/40 px-2 py-1 -mx-2 -my-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <span>{t("assistant.operationSummary", { count: totalChanges })}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {summary.rename && (
            <SummaryRow
              icon={<FileText className="h-4 w-4" />}
              label={t("assistant.renamePaper")}
            >
              <span className="font-medium text-foreground">
                {summary.rename.title}
              </span>
            </SummaryRow>
          )}

          {summary.deleted.length > 0 && (
            <SummaryRow
              icon={<Trash2 className="h-4 w-4" />}
              label={t("assistant.deleteQuestions", {
                count: summary.deleted.length,
              })}
            >
              <span className="text-muted-foreground">
                {summary.deleted.join(", ")}
              </span>
            </SummaryRow>
          )}

          {summary.reordered && (
            <SummaryRow
              icon={<ListOrdered className="h-4 w-4" />}
              label={t("assistant.reorderQuestions")}
            >
              <span className="text-muted-foreground">
                {summary.reordered.join(" → ")}
              </span>
            </SummaryRow>
          )}

          <QuestionList
            icon={<Plus className="h-4 w-4" />}
            title={t("assistant.addQuestions", { count: summary.added.length })}
            questions={summary.added}
          />
          <QuestionList
            icon={<Pencil className="h-4 w-4" />}
            title={t("assistant.updateQuestions", {
              count: summary.updated.length,
            })}
            questions={summary.updated}
          />
        </div>
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <Undo2 className="h-4 w-4" />
              {t("assistant.undo")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => applyResult(id)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-shadow hover:shadow-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t("assistant.applyToPaper")}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/70 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xs">{children}</div>
    </div>
  );
}

function QuestionList({
  icon,
  title,
  questions,
}: {
  icon: React.ReactNode;
  title: string;
  questions: Question[];
}) {
  if (questions.length === 0) return null;
  return (
    <div className="rounded-xl bg-muted px-2 py-1.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <ol className="space-y-1.5">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl bg-background/80 px-2.5 py-2 border border-border/40">
            <div className="mb-1 flex items-baseline gap-2">
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
            <div className="min-w-0 text-xs">
              <Markdown variant="compact">{q.content}</Markdown>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
