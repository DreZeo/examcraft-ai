import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePaperStore } from "../../stores/paperStore";
import { toStudentVersion } from "../../lib/exam/studentVersion";
import { QuestionBlock } from "./QuestionBlock";
import { QuestionEditModal } from "./QuestionEditModal";
import { ExamInfoHeader } from "./ExamInfoHeader";

/**
 * Center "sheet": a centered white page that renders the assembled paper. Shows
 * a guided empty state when there are no questions. Honors the teacher/student
 * view toggle by filtering answers for the student preview. Hosts the
 * block-level edit modal and the "add question manually" affordances.
 */
export function PaperCanvas() {
  const { t } = useTranslation();
  const { paper, view, addBlankQuestion } = usePaperStore();
  const display = view === "student" ? toStudentVersion(paper) : paper;
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId
    ? (paper.questions.find((q) => q.id === editingId) ?? null)
    : null;

  function addAndEdit() {
    setEditingId(addBlankQuestion());
  }

  return (
    <div className="flex justify-center px-6 py-8">
      <div className="paper-sheet w-full max-w-3xl rounded-lg bg-white p-10 shadow-sm">
        {paper.title && (
          <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">
            {paper.title}
          </h1>
        )}

        {display.questions.length > 0 && <ExamInfoHeader paper={display} />}

        {display.questions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base font-medium text-slate-600">
              {t("paper.emptyTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              {t("paper.emptySubtitle")}
            </p>
            <button
              type="button"
              onClick={addAndEdit}
              className="no-print mt-4 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("paper.addQuestion")}
            </button>
          </div>
        ) : (
          <>
            <ol className="space-y-6">
              {display.questions.map((q, i) => (
                <QuestionBlock
                  key={q.id}
                  question={q}
                  index={i}
                  studentView={view === "student"}
                  onEdit={setEditingId}
                />
              ))}
            </ol>
            {view !== "student" && (
              <div className="no-print mt-6 border-t border-dashed border-slate-200 pt-4 text-center">
                <button
                  type="button"
                  onClick={addAndEdit}
                  className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t("paper.addQuestion")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <QuestionEditModal
          question={editing}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
