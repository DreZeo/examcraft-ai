import type { ExamPaper, Question, QuestionType } from "../types/exam";
import { inferQuestionTypeStrategy } from "./questionTypeStrategy";

/** Display order shared by preview and exports; absent types are skipped. */
export const QUESTION_TYPE_ORDER: readonly QuestionType[] = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "fill-in-blank",
  "short-answer",
  "essay",
  "calculation",
];

export const QUESTION_TYPE_LABEL_ZH: Record<QuestionType, string> = {
  "single-choice": "单选题",
  "multiple-choice": "多选题",
  "true-false": "判断题",
  "fill-in-blank": "填空题",
  "short-answer": "简答题",
  essay: "论述题",
  calculation: "计算题",
};

const CN_ORDINALS = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
];

export interface PaperQuestionSection {
  type: QuestionType;
  ordinal: string;
  title: string;
  questions: Question[];
  score: number;
}

export function cnOrdinal(index: number): string {
  return CN_ORDINALS[index] ?? String(index + 1);
}

export function groupQuestionsByType(paper: ExamPaper): PaperQuestionSection[] {
  const sections: PaperQuestionSection[] = [];
  const labels = questionTypeLabelsForPaper(paper);

  for (const type of QUESTION_TYPE_ORDER) {
    const questions = paper.questions.filter((question) => question.type === type);
    if (questions.length === 0) continue;
    const ordinal = cnOrdinal(sections.length);
    sections.push({
      type,
      ordinal,
      title: `${ordinal}、${labels[type]}`,
      questions,
      score: questions.reduce((sum, question) => sum + question.score, 0),
    });
  }

  return sections;
}

export function questionTypeLabelsForPaper(
  paper: ExamPaper,
): Record<QuestionType, string> {
  const match = inferQuestionTypeStrategy({
    requestText: [paper.title, paper.metadata?.subject].filter(Boolean).join("\n"),
  });
  return {
    ...QUESTION_TYPE_LABEL_ZH,
    ...(match?.strategy.sectionLabels ?? {}),
  };
}
