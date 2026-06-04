import {
  FileText,
  ListTree,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Question } from "../../lib/types/exam";

interface PaperOutlineProps {
  questions: Question[];
  activeQuestionId: string | null;
  open: boolean;
  onToggle: () => void;
  onActiveQuestionChange: (id: string | null) => void;
}

/** Desktop paper outline: click a question summary to jump to its sheet block. */
export function PaperOutline({
  questions,
  activeQuestionId,
  open,
  onToggle,
  onActiveQuestionChange,
}: PaperOutlineProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={
        open
          ? "no-print hidden w-56 shrink-0 border-r border-border bg-background/60 lg:flex lg:flex-col"
          : "no-print hidden w-12 shrink-0 border-r border-border bg-background/60 lg:flex lg:flex-col"
      }
    >
      <div
        className={
          open
            ? "flex items-center gap-2 border-b border-border px-3 py-3"
            : "flex justify-center border-b border-border py-3"
        }
      >
        {open && <ListTree className="h-4 w-4 text-primary" />}
        {open && (
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {t("paper.outline")}
          </h2>
        )}
        <button
          type="button"
          aria-label={open ? t("paper.collapseOutline") : t("paper.expandOutline")}
          title={open ? t("paper.collapseOutline") : t("paper.expandOutline")}
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {questions.length === 0 ? (
        <div
          className={
            open
              ? "flex flex-1 flex-col items-center justify-center px-4 text-center"
              : "flex flex-1 items-start justify-center pt-4"
          }
        >
          <FileText className="h-7 w-7 text-muted-foreground/70" />
          {open && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {t("paper.outlineEmpty")}
            </p>
          )}
        </div>
      ) : (
        <nav
          className={
            open
              ? "min-h-0 flex-1 overflow-auto p-2"
              : "min-h-0 flex-1 overflow-auto px-1 py-2"
          }
        >
          <ol className="space-y-1">
            {questions.map((question, index) => (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => {
                    onActiveQuestionChange(question.id);
                    scrollToQuestion(question.id);
                  }}
                  className={
                    open
                      ? question.id === activeQuestionId
                        ? activeItemCls
                        : inactiveItemCls
                      : question.id === activeQuestionId
                        ? collapsedActiveItemCls
                        : collapsedInactiveItemCls
                  }
                  aria-current={
                    question.id === activeQuestionId ? "location" : undefined
                  }
                  aria-label={`${index + 1}. ${t(`questionType.${question.type}`)}`}
                  title={`${index + 1}. ${t(`questionType.${question.type}`)}`}
                >
                  <span
                    className={
                      open
                        ? "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground"
                        : "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground"
                    }
                  >
                    {index + 1}
                  </span>
                  {open && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {t(`questionType.${question.type}`)}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
                        {summarizeQuestion(question.content)}
                      </span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </aside>
  );
}

function scrollToQuestion(id: string) {
  document
    .getElementById(`question-${id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function summarizeQuestion(content: string) {
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_\-~|[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "…";
  return text.length > 44 ? `${text.slice(0, 44)}…` : text;
}

const baseItemCls =
  "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer";

const activeItemCls =
  baseItemCls +
  " bg-primary/10 text-primary ring-1 ring-primary/20";

const inactiveItemCls =
  baseItemCls +
  " text-foreground hover:bg-accent hover:text-accent-foreground";

const collapsedBaseItemCls =
  "flex w-full justify-center rounded-md py-1 transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring cursor-pointer";

const collapsedActiveItemCls =
  collapsedBaseItemCls +
  " bg-primary/10 text-primary ring-1 ring-primary/20";

const collapsedInactiveItemCls =
  collapsedBaseItemCls +
  " text-muted-foreground hover:bg-accent hover:text-accent-foreground";
