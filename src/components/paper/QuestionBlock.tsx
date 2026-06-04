import { useTranslation } from "react-i18next";
import type { Question } from "../../lib/types/exam";
import { usePaperStore } from "../../stores/paperStore";
import { useAssistantStore } from "../../stores/assistantStore";
import { Markdown } from "./Markdown";

interface QuestionBlockProps {
  question: Question;
  index: number;
  studentView: boolean;
}

/**
 * A single question rendered on the sheet. Static = minimal sheet style; on
 * hover it lifts into a card revealing reorder/delete actions. Answers and
 * explanations show only in teacher view.
 */
export function QuestionBlock({
  question,
  index,
  studentView,
}: QuestionBlockProps) {
  const { t } = useTranslation();
  const { reorder, deleteQuestion } = usePaperStore();
  const focusQuestion = useAssistantStore((s) => s.focusQuestion);

  return (
    <li className="group relative rounded-md border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50/60">
      {!studentView && (
        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
          <ActionButton
            label={t("paper.aiModify")}
            onClick={() => focusQuestion(question)}
          >
            ✦
          </ActionButton>
          <ActionButton
            label={t("paper.moveUp")}
            onClick={() => reorder(question.id, "up")}
          >
            ↑
          </ActionButton>
          <ActionButton
            label={t("paper.moveDown")}
            onClick={() => reorder(question.id, "down")}
          >
            ↓
          </ActionButton>
          <ActionButton
            label={t("paper.delete")}
            onClick={() => deleteQuestion(question.id)}
          >
            ✕
          </ActionButton>
        </div>
      )}

      <div className="flex gap-2">
        <span className="select-none font-medium text-slate-500">
          {index + 1}.
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">
              <Markdown>{question.content}</Markdown>
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              ({question.score})
            </span>
          </div>

          {"options" in question && (
            <ol className="mt-1 space-y-0.5 pl-1 text-sm text-slate-700">
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
    <div className="mt-2 rounded-md bg-indigo-50/70 px-3 py-2 text-sm text-slate-700">
      {answer && (
        <p>
          <span className="font-medium text-indigo-700">
            【{t("paper.answer")}】
          </span>{" "}
          {answer}
        </p>
      )}
      {explanation && (
        <p className="mt-1">
          <span className="font-medium text-indigo-700">
            【{t("paper.explanation")}】
          </span>{" "}
          {explanation}
        </p>
      )}
    </div>
  );
}

function formatAnswer(q: Question): string {
  switch (q.type) {
    case "single-choice":
      return String.fromCharCode(65 + q.correctAnswer);
    case "multiple-choice":
      return q.correctAnswers
        .map((i) => String.fromCharCode(65 + i))
        .join(", ");
    case "true-false":
      return q.correctAnswer ? "✓" : "✗";
    case "fill-in-blank":
      return q.blanks.join(" / ");
    case "short-answer":
      return q.referenceAnswer;
    case "essay":
      return q.scoringCriteria;
    case "calculation":
      return q.answer;
  }
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
      className="grid h-6 w-6 place-items-center rounded border border-slate-200 bg-white text-xs text-slate-500 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
