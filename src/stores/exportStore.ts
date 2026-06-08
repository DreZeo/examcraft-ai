import { create } from "zustand";

/**
 * Which exam-info header fields to include in an export, configured at export
 * time. Subject / duration / total-score draw their values from the paper
 * metadata when present; class, student name, and score are fill-in blanks.
 */
export interface ExamInfoFields {
  subject: boolean;
  className: boolean;
  studentName: boolean;
  duration: boolean;
  totalScore: boolean;
  score: boolean;
}

interface ExportState {
  /** Show the exam-info header (subject/class/name/...) in Markdown/PDF output. */
  showHeader: boolean;
  fields: ExamInfoFields;
  setShowHeader: (show: boolean) => void;
  toggleField: (field: keyof ExamInfoFields) => void;
}

export const defaultExamInfoFields = (): ExamInfoFields => ({
  subject: true,
  className: true,
  studentName: true,
  duration: false,
  totalScore: false,
  score: false,
});

export const useExportStore = create<ExportState>((set) => ({
  showHeader: true,
  fields: defaultExamInfoFields(),
  setShowHeader: (show) => set({ showHeader: show }),
  toggleField: (field) =>
    set((s) => ({ fields: { ...s.fields, [field]: !s.fields[field] } })),
}));
