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
import {
  studentAnswerSpaceLines,
  studentBlankUnderlineLength,
} from "../../lib/exam/pagination";
import {
  choiceDisplay,
  stripLeadingQuestionNumber,
} from "../../lib/exam/choiceDisplay";
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

  const choice = isChoiceQuestion(question) ? choiceDisplay(question) : null;
  const content =
    choice?.stem ?? stripLeadingQuestionNumber(question.content);

  return (
    <li
      id={`question-${question.id}`}
      data-question-id={question.id}
      className="question-block scroll-mt-8 group relative rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-accent/40"
    >
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
            <div
              className="min-w-0 flex-1"
            >
              {studentView && question.type === "fill-in-blank" ? (
                <FillBlankContent question={question} />
              ) : (
                <Markdown>{content}</Markdown>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({question.score})
            </span>
          </div>

          {choice && choice.options.length > 0 && (
            <ol className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 pl-1 text-sm text-foreground sm:grid-cols-2">
              {choice.options.map((opt, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <Markdown variant="compact">{opt}</Markdown>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {!studentView && <AnswerBlock question={question} />}
          {studentView && <StudentAnswerSpace question={question} />}
        </div>
      </div>
    </li>
  );
}

function FillBlankContent({ question }: { question: Question }) {
  if (question.type !== "fill-in-blank") {
    return <Markdown>{question.content}</Markdown>;
  }
  const blankLength = studentBlankUnderlineLength(question);
  const replacement = "_".repeat(blankLength);
  const content = /_{3,}/.test(question.content)
    ? question.content.replace(/_{3,}/g, replacement)
    : `${stripLeadingQuestionNumber(question.content)} ${Array.from(
        { length: Array.isArray(question.blanks) ? question.blanks.length : 1 },
        () => replacement,
      ).join(" ")}`;
  return <Markdown>{content}</Markdown>;
}

function StudentAnswerSpace({ question }: { question: Question }) {
  const lines = studentAnswerSpaceLines(question);
  if (lines === 0) return null;
  return (
    <div
      className="answer-space mt-3 rounded-sm border border-dashed border-border"
      style={{ height: `${lines * 1.7}em` }}
      aria-hidden="true"
    />
  );
}

function isChoiceQuestion(
  question: Question,
): question is Extract<Question, { type: "single-choice" | "multiple-choice" }> {
  return question.type === "single-choice" || question.type === "multiple-choice";
}

function AnswerBlock({ question }: { question: Question }) {
  const { t } = useTranslation();
  const explanation =
    "explanation" in question ? question.explanation : undefined;

  const sections = getAnswerSections(question, {
    answer: t("paper.answer"),
    solution: t("paper.solution"),
    scoringPoints: t("paper.scoringPoints"),
    true: t("paper.true"),
    false: t("paper.false"),
  });

  if (!explanation && sections.length === 0) return null;

  return (
    <div className="answer-block mt-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
      {sections.map((section) => (
        <AnswerSection key={section.label} {...section} />
      ))}
      {explanation && (
        <AnswerSection
          label={t("paper.explanation")}
          content={explanation}
        />
      )}
    </div>
  );
}

interface AnswerSectionProps {
  label: string;
  content?: string;
}

function AnswerSection({ label, content }: AnswerSectionProps) {
  const safeContent = content ?? "";
  if (!safeContent.trim()) return null;

  return (
    <div className="mt-1 first:mt-0">
      <span className="font-medium text-primary">【{label}】</span>
      <div className="mt-0.5">
        <Markdown variant="compact">{safeContent}</Markdown>
      </div>
    </div>
  );
}

function getAnswerSections(
  question: Question,
  labels: {
    answer: string;
    solution: string;
    scoringPoints: string;
    true: string;
    false: string;
  },
): AnswerSectionProps[] {
  switch (question.type) {
    case "single-choice":
      return [
        {
          label: labels.answer,
          content: String.fromCharCode(65 + question.correctAnswer),
        },
      ];
    case "multiple-choice":
      return [
        {
          label: labels.answer,
          content: (Array.isArray(question.correctAnswers)
            ? question.correctAnswers
            : []
          )
            .map((i) => String.fromCharCode(65 + i))
            .join(", "),
        },
      ];
    case "true-false":
      return [
        {
          label: labels.answer,
          content: question.correctAnswer ? labels.true : labels.false,
        },
      ];
    case "fill-in-blank":
      return [
        {
          label: labels.answer,
          content: (Array.isArray(question.blanks) ? question.blanks : []).join(
            " / ",
          ),
        },
      ];
    case "short-answer": {
      const sections = [
        { label: labels.answer, content: question.referenceAnswer },
      ];
      if (question.scoringPoints?.length) {
        sections.push({
          label: labels.scoringPoints,
          content: question.scoringPoints.map((point) => `- ${point}`).join("\n"),
        });
      }
      return sections;
    }
    case "essay":
      return [{ label: labels.answer, content: question.scoringCriteria }];
    case "calculation":
      return [
        { label: labels.answer, content: question.answer },
        { label: labels.solution, content: question.solution },
      ];
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
      className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      {children}
    </button>
  );
}
