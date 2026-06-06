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

const ENGLISH_SECTION_ORDER = [
  "english-vocabulary-choice",
  "english-cloze",
  "english-reading",
  "english-translation",
  "english-composition",
] as const;

const ENGLISH_SECTION_LABELS: Record<(typeof ENGLISH_SECTION_ORDER)[number], string> = {
  "english-vocabulary-choice": "语法与词汇单选",
  "english-cloze": "完形填空",
  "english-reading": "阅读理解",
  "english-translation": "翻译",
  "english-composition": "作文",
};

export interface PaperQuestionSection {
  key: string;
  type: QuestionType;
  ordinal: string;
  title: string;
  questions: Question[];
  score: number;
  passage?: string;
}

export function cnOrdinal(index: number): string {
  return CN_ORDINALS[index] ?? String(index + 1);
}

export function groupQuestionsByType(paper: ExamPaper): PaperQuestionSection[] {
  if (isEnglishPaper(paper)) {
    return groupEnglishSections(paper);
  }

  return groupByQuestionType(paper);
}

function groupByQuestionType(paper: ExamPaper): PaperQuestionSection[] {
  const sections: PaperQuestionSection[] = [];
  const labels = questionTypeLabelsForPaper(paper);

  for (const type of QUESTION_TYPE_ORDER) {
    const questions = paper.questions.filter((question) => question.type === type);
    if (questions.length === 0) continue;
    const ordinal = cnOrdinal(sections.length);
    sections.push({
      key: type,
      type,
      ordinal,
      title: `${ordinal}、${labels[type]}`,
      questions,
      score: questions.reduce((sum, question) => sum + question.score, 0),
    });
  }

  return sections;
}

function groupEnglishSections(paper: ExamPaper): PaperQuestionSection[] {
  const englishGroups = new Map<string, {
    kind: (typeof ENGLISH_SECTION_ORDER)[number];
    title?: string;
    passage?: string;
    questions: Question[];
    firstIndex: number;
  }>();
  const fallbackQuestions: Question[] = [];

  paper.questions.forEach((question, index) => {
    const kind = englishSectionKind(question.examSection?.kind);
    if (!kind) {
      fallbackQuestions.push(question);
      return;
    }
    const key = `${kind}:${question.examSection?.groupId ?? kind}`;
    const existing = englishGroups.get(key);
    if (existing) {
      existing.questions.push(question);
      existing.title ??= question.examSection?.title;
      existing.passage ??= question.examSection?.passage;
      return;
    }
    englishGroups.set(key, {
      kind,
      title: question.examSection?.title,
      passage: question.examSection?.passage,
      questions: [question],
      firstIndex: index,
    });
  });

  const orderedGroups = Array.from(englishGroups.entries()).sort((a, b) => {
    const orderA = ENGLISH_SECTION_ORDER.indexOf(a[1].kind);
    const orderB = ENGLISH_SECTION_ORDER.indexOf(b[1].kind);
    return orderA === orderB ? a[1].firstIndex - b[1].firstIndex : orderA - orderB;
  });

  const sections: PaperQuestionSection[] = orderedGroups.map(([key, group], index) =>
    makeSection({
      key,
      type: group.questions[0].type,
      label: group.title ?? ENGLISH_SECTION_LABELS[group.kind],
      questions: group.questions,
      index,
      passage: group.passage,
    }),
  );

  if (fallbackQuestions.length === 0) return sections;

  for (const fallback of groupByQuestionType({ ...paper, questions: fallbackQuestions })) {
    const ordinal = cnOrdinal(sections.length);
    sections.push({
      ...fallback,
      ordinal,
      title: `${ordinal}、${fallback.title.replace(/^.*?、/, "")}`,
    });
  }

  return sections;
}

function makeSection({
  key,
  type,
  label,
  questions,
  index,
  passage,
}: {
  key: string;
  type: QuestionType;
  label: string;
  questions: Question[];
  index: number;
  passage?: string;
}): PaperQuestionSection {
  const ordinal = cnOrdinal(index);
  return {
    key,
    type,
    ordinal,
    title: `${ordinal}、${label}`,
    questions,
    score: questions.reduce((sum, question) => sum + question.score, 0),
    passage,
  };
}

function englishSectionKind(
  kind: string | undefined,
): (typeof ENGLISH_SECTION_ORDER)[number] | null {
  return ENGLISH_SECTION_ORDER.find((candidate) => candidate === kind) ?? null;
}

function isEnglishPaper(paper: ExamPaper): boolean {
  return (
    inferQuestionTypeStrategy({
      requestText: [paper.title, paper.metadata?.subject].filter(Boolean).join("\n"),
    })?.strategy.id === "english-language"
  );
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
