import { useTranslation } from "react-i18next";
import type { ExamPaper } from "../../lib/types/exam";
import { totalScore } from "../../lib/exam/merge";
import { useExportStore } from "../../stores/exportStore";

/**
 * Exam-info header rendered under the paper title: subject / class / name /
 * duration / total-score with fill-in underlines for blanks. Field visibility
 * is driven by the export store so the on-screen sheet matches the printed PDF.
 * Hidden entirely when the header toggle is off or no fields are enabled.
 */
export function ExamInfoHeader({ paper }: { paper: ExamPaper }) {
  const { t } = useTranslation();
  const showHeader = useExportStore((s) => s.showHeader);
  const fields = useExportStore((s) => s.fields);
  const meta = paper.metadata ?? {};

  const items: string[] = [];
  if (fields.subject) items.push(`${t("examInfo.subject")}：${meta.subject ?? ""}`);
  if (fields.className)
    items.push(`${t("examInfo.className")}：${meta.className ?? ""}`);
  if (fields.studentName) items.push(`${t("examInfo.studentName")}：`);
  if (fields.duration)
    items.push(
      `${t("examInfo.duration")}：${meta.duration != null ? `${meta.duration}` : ""}`,
    );
  if (fields.totalScore)
    items.push(`${t("examInfo.totalScore")}：${meta.totalScore ?? totalScore(paper)}`);

  if (!showHeader || items.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-x-8 gap-y-1 border-b border-border pb-4 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-end whitespace-nowrap">
          {item}
          <span className="ml-1 inline-block min-w-16 border-b border-muted-foreground/60" />
        </span>
      ))}
    </div>
  );
}
