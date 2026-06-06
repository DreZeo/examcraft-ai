import {
  ListChecks,
  ListTree,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Question } from "../../lib/types/exam";
import { summarizeMarkdown } from "../../lib/exam/markdownPlainText";

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
          ? "no-print motion-panel-shell hidden w-56 shrink-0 overflow-hidden border-r border-border bg-background/60 lg:flex lg:flex-col"
          : "no-print motion-panel-shell hidden w-16 shrink-0 overflow-hidden border-r border-border bg-background/60 lg:flex lg:flex-col"
      }
    >
      <div
        className={
          open
            ? "flex items-center gap-2 border-b border-border px-2.5 py-3"
            : "flex justify-center border-b border-border py-3"
        }
      >
        {open && (
          <div className="motion-panel-content flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
            <ListTree className="h-4 w-4 shrink-0 text-primary" />
            <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
              {t("paper.outline")}
            </h2>
          </div>
        )}
        <button
          type="button"
          aria-label={open ? t("paper.collapseOutline") : t("paper.expandOutline")}
          title={open ? t("paper.collapseOutline") : t("paper.expandOutline")}
          onClick={onToggle}
          className="group inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
          ) : (
            <PanelLeftOpen className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
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
          <ListChecks className="h-7 w-7 text-muted-foreground/70" />
          {open && (
            <p className="motion-panel-content mt-2 w-44 overflow-hidden text-xs leading-5 text-muted-foreground">
              {t("paper.outlineEmpty")}
            </p>
          )}
        </div>
      ) : (
        <nav
          className={
            open
              ? "min-h-0 flex-1 overflow-auto p-2"
              : "min-h-0 flex-1 overflow-auto py-2 pl-2 pr-3"
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
                    <span className="motion-panel-content min-w-0 flex-1 overflow-hidden">
                      <span className="block truncate text-xs font-medium">
                        {t(`questionType.${question.type}`)}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
                        {summarizeMarkdown(question.content)}
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
  "flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring cursor-pointer";

const collapsedActiveItemCls =
  collapsedBaseItemCls +
  " bg-primary/10 text-primary ring-1 ring-primary/20";

const collapsedInactiveItemCls =
  collapsedBaseItemCls +
  " text-muted-foreground hover:bg-accent hover:text-accent-foreground";
