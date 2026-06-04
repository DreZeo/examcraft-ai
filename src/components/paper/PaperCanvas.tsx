import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus } from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { primaryBtn, secondaryBtn } from "../../lib/ui/styles";
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
      <div className="paper-sheet w-full max-w-3xl rounded-lg bg-card p-10 shadow-sm">
        {paper.title && (
          <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">
            {paper.title}
          </h1>
        )}

        {display.questions.length > 0 && <ExamInfoHeader paper={display} />}

        {display.questions.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
            <p className="text-base font-medium text-foreground">
              {t("paper.emptyTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {t("paper.emptySubtitle")}
            </p>
            <button
              type="button"
              onClick={addAndEdit}
              className={`no-print mt-4 ${primaryBtn}`}
            >
              <Plus className="h-4 w-4" />
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
              <div className="no-print mt-6 border-t border-dashed border-border pt-4 text-center">
                <button
                  type="button"
                  onClick={addAndEdit}
                  className={secondaryBtn}
                >
                  <Plus className="h-4 w-4" />
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
