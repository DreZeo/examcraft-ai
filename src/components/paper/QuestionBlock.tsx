import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Pencil,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import type { Question } from "../../lib/types/exam";
import { usePaperStore } from "../../stores/paperStore";
import { useAssistantStore } from "../../stores/assistantStore";
import { formatAnswer } from "../../lib/exam/answer";
import { Markdown } from "./Markdown";

interface QuestionBlockProps {
  question: Question;
  index: number;
  studentView: boolean;
  onEdit: (id: string) => void;
}

/**
 * A single question rendered on the sheet. Static = minimal sheet style; on
 * hover it lifts into a card revealing edit/reorder/delete actions. Answers and
 * explanations show only in teacher view.
 */
export function QuestionBlock({
  question,
  index,
  studentView,
  onEdit,
}: QuestionBlockProps) {
  const { t } = useTranslation();
  const { reorder, deleteQuestion } = usePaperStore();
  const focusQuestion = useAssistantStore((s) => s.focusQuestion);

  return (
    <li className="question-block group relative rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-accent/40">
      {!studentView && (
        <div className="no-print absolute right-2 top-2 hidden gap-1 group-hover:flex">
          <ActionButton
            label={t("paper.aiModify")}
            onClick={() => focusQuestion(question)}
          >
            <Sparkles className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            label={t("paper.edit")}
            onClick={() => onEdit(question.id)}
          >
            <Pencil className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            label={t("paper.moveUp")}
            onClick={() => reorder(question.id, "up")}
          >
            <ArrowUp className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            label={t("paper.moveDown")}
            onClick={() => reorder(question.id, "down")}
          >
            <ArrowDown className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            label={t("paper.delete")}
            onClick={() => deleteQuestion(question.id)}
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      )}

      <div className="flex gap-2">
        <span className="select-none font-medium text-muted-foreground">
          {index + 1}.
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">
              <Markdown>{question.content}</Markdown>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({question.score})
            </span>
          </div>

          {"options" in question && (
            <ol className="mt-1 space-y-0.5 pl-1 text-sm text-foreground">
              {question.options.map((opt, i) => (
                <li key={i}>
                  {String.fromCharCode(65 + i)}. {opt}
                </li>
              ))}
            </ol>
          )}

          {!studentView && <AnswerBlock question={question} />}
        </div>
      </div>
    </li>
  );
}

function AnswerBlock({ question }: { question: Question }) {
  const { t } = useTranslation();
  const answer = formatAnswer(question);
  const explanation =
    "explanation" in question ? question.explanation : undefined;

  if (!answer && !explanation) return null;

  return (
    <div className="answer-block mt-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
      {answer && (
        <p>
          <span className="font-medium text-primary">
            【{t("paper.answer")}】
          </span>{" "}
          {answer}
        </p>
      )}
      {explanation && (
        <p className="mt-1">
          <span className="font-medium text-primary">
            【{t("paper.explanation")}】
          </span>{" "}
          {explanation}
        </p>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      {children}
    </button>
  );
}
