import { useTranslation } from "react-i18next";
import { usePaperStore } from "../../stores/paperStore";
import { toStudentVersion } from "../../lib/exam/studentVersion";
import { QuestionBlock } from "./QuestionBlock";

/**
 * Center "sheet": a centered white page that renders the assembled paper. Shows
 * a guided empty state when there are no questions. Honors the teacher/student
 * view toggle by filtering answers for the student preview.
 */
export function PaperCanvas() {
  const { t } = useTranslation();
  const { paper, view } = usePaperStore();
  const display = view === "student" ? toStudentVersion(paper) : paper;

  return (
    <div className="flex justify-center px-6 py-8">
      <div className="w-full max-w-3xl rounded-lg bg-white p-10 shadow-sm">
        {paper.title && (
          <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">
            {paper.title}
          </h1>
        )}

        {display.questions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base font-medium text-slate-600">
              {t("paper.emptyTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              {t("paper.emptySubtitle")}
            </p>
          </div>
        ) : (
          <ol className="space-y-6">
            {display.questions.map((q, i) => (
              <QuestionBlock
                key={q.id}
                question={q}
                index={i}
                studentView={view === "student"}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
