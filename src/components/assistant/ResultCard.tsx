import { useState } from "react";
import { useTranslation } from "react-i18next";
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      {prose && (
        <div className="mb-2 text-slate-600">
          <Markdown>{prose}</Markdown>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left font-medium text-slate-700"
      >
        <span>{t("assistant.generated", { count: questions.length })}</span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <ol className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-md bg-slate-50 px-2 py-1.5">
              <div className="flex items-baseline gap-2">
                <span className="select-none text-xs font-medium text-slate-400">
                  {i + 1}.
                </span>
                <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">
                  {q.type}
                </span>
                <span className="ml-auto text-xs text-slate-400">
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
            <span className="text-xs text-slate-400">
              {t("assistant.applied")}
            </span>
            <button
              type="button"
              onClick={() => undoApply()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("assistant.undo")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => applyResult(id)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            {t("assistant.applyToPaper")}
          </button>
        )}
      </div>
    </div>
  );
}
