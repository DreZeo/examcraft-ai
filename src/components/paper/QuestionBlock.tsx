import { useCallback, useEffect, useRef } from "react";
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
  useMarkdownFormat,
  type MarkdownFormatTarget,
} from "../layout/MarkdownFormatContext";
import { applyMarkdownFormat } from "../layout/markdownFormat";
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
  const { reorder, deleteQuestion, editQuestion } = usePaperStore();
  const focusQuestion = useAssistantStore((s) => s.focusQuestion);
  const { registerTarget, clearTarget } = useMarkdownFormat();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<MarkdownFormatTarget | null>(null);

  const registerPreviewSelection = useCallback(() => {
    if (studentView) return;
    const selection = window.getSelection();
    const selected = selection?.toString() ?? "";
    const contentNode = contentRef.current;
    if (!selection || !contentNode || !selected.trim()) return;
    if (!contentNode.contains(selection.anchorNode) || !contentNode.contains(selection.focusNode)) {
      return;
    }

    const start = question.content.indexOf(selected);
    if (start === -1) return;
    const end = start + selected.length;
    const target: MarkdownFormatTarget = {
      apply: (format) => {
        const result = applyMarkdownFormat(question.content, start, end, format);
        editQuestion({ ...question, content: result.value });
        selection.removeAllRanges();
      },
    };
    targetRef.current = target;
    registerTarget(target);
  }, [editQuestion, question, registerTarget, studentView]);

  useEffect(() => {
    const onSelectionChange = () => {
      const selection = window.getSelection();
      const contentNode = contentRef.current;
      const selected = selection?.toString() ?? "";
      if (!contentNode || !selected.trim()) {
        if (targetRef.current) clearTarget(targetRef.current);
        targetRef.current = null;
        return;
      }
      if (!contentNode.contains(selection?.anchorNode ?? null)) {
        if (targetRef.current) clearTarget(targetRef.current);
        targetRef.current = null;
      }
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (targetRef.current) clearTarget(targetRef.current);
    };
  }, [clearTarget]);

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
              ref={contentRef}
              className="min-w-0 flex-1"
              onMouseUp={registerPreviewSelection}
              onKeyUp={registerPreviewSelection}
            >
              <Markdown>{question.content}</Markdown>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({question.score})
            </span>
          </div>

          {"options" in question && !contentIncludesOptions(question.content, question.options) && (
            <ol className="mt-1 space-y-0.5 pl-1 text-sm text-foreground">
              {question.options.map((opt, i) => (
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
        </div>
      </div>
    </li>
  );
}

function contentIncludesOptions(content: string, options: string[]): boolean {
  if (options.length === 0) return false;
  const optionMarkers = content.match(/(?:^|\s)[A-J][.)、]\s*/g) ?? [];
  if (optionMarkers.length >= options.length) return true;

  const lines = content
    .split(/\r?\n/)
    .map((line) => normalizeOptionText(line.replace(/^\s*[A-J][.)、]\s*/, "")))
    .filter(Boolean);
  return options.every((option) =>
    lines.includes(normalizeOptionText(option)),
  );
}

function normalizeOptionText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
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
  content: string;
}

function AnswerSection({ label, content }: AnswerSectionProps) {
  if (!content.trim()) return null;

  return (
    <div className="mt-1 first:mt-0">
      <span className="font-medium text-primary">【{label}】</span>
      <div className="mt-0.5">
        <Markdown variant="compact">{content}</Markdown>
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
          content: question.correctAnswers
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
      return [{ label: labels.answer, content: question.blanks.join(" / ") }];
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
