import { useEffect, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus } from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { primaryBtn, secondaryBtn } from "../../lib/ui/styles";
import { toStudentVersion } from "../../lib/exam/studentVersion";
import { QuestionBlock } from "./QuestionBlock";
import { QuestionEditModal } from "./QuestionEditModal";
import { ExamInfoHeader } from "./ExamInfoHeader";

interface PaperCanvasProps {
  scrollRootRef?: RefObject<HTMLElement | null>;
  onActiveQuestionChange?: (id: string | null) => void;
}

/**
 * Center "sheet": a centered white page that renders the assembled paper. Shows
 * a guided empty state when there are no questions. Honors the teacher/student
 * view toggle by filtering answers for the student preview. Hosts the
 * block-level edit modal and the "add question manually" affordances.
 */
export function PaperCanvas({
  scrollRootRef,
  onActiveQuestionChange,
}: PaperCanvasProps) {
  const { t } = useTranslation();
  const { paper, view, addBlankQuestion } = usePaperStore();
  const display = view === "student" ? toStudentVersion(paper) : paper;
  const questionIds = display.questions.map((question) => question.id).join("|");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId
    ? (paper.questions.find((q) => q.id === editingId) ?? null)
    : null;

  function addAndEdit() {
    setEditingId(addBlankQuestion());
  }

  useEffect(() => {
    if (!onActiveQuestionChange) return;
    if (display.questions.length === 0) {
      onActiveQuestionChange(null);
      return;
    }
    const root = scrollRootRef?.current ?? null;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.questionId;
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }

        const next =
          Array.from(visible.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          null;
        onActiveQuestionChange(next);
      },
      {
        root,
        threshold: [0.15, 0.35, 0.6, 0.85],
        rootMargin: "-12% 0px -62% 0px",
      },
    );

    for (const question of display.questions) {
      const node = document.getElementById(`question-${question.id}`);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [questionIds, onActiveQuestionChange, scrollRootRef]);

  return (
    <div className="flex min-w-fit justify-center px-4 py-8 sm:px-6">
      <div className="paper-sheet min-h-[297mm] w-full max-w-[210mm] rounded-lg bg-card p-6 shadow-sm sm:p-[14mm]">
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
