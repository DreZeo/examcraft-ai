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

  const items: ExamInfoItem[] = [];
  if (fields.subject)
    items.push({
      label: t("examInfo.subject"),
      value: meta.subject ?? "",
      fill: true,
    });
  if (fields.className)
    items.push({
      label: t("examInfo.className"),
      value: meta.className ?? "",
      fill: true,
    });
  if (fields.studentName)
    items.push({ label: t("examInfo.studentName"), value: "", fill: true });
  if (fields.duration)
    items.push(
      {
        label: t("examInfo.duration"),
        value: meta.duration != null ? `${meta.duration}` : "",
        fill: true,
      },
    );
  if (fields.totalScore)
    items.push({
      label: t("examInfo.totalScore"),
      value: `${meta.totalScore ?? totalScore(paper)}`,
      fill: false,
    });
  if (fields.score)
    items.push({ label: t("examInfo.score"), value: "", fill: true });

  if (!showHeader || items.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-x-8 gap-y-1 border-b border-border pb-4 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-end whitespace-nowrap">
          {item.label}：{item.value}
          {item.fill && (
            <span className="ml-1 inline-block min-w-16 border-b border-muted-foreground/60" />
          )}
        </span>
      ))}
    </div>
  );
}

interface ExamInfoItem {
  label: string;
  value: string;
  fill: boolean;
}
