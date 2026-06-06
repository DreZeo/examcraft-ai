import { describe, expect, it } from "vitest";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import { cnOrdinal, groupQuestionsByType } from "../exam/paperSections";

function makePaper(): ExamPaper {
  return ExamPaperSchema.parse({
    title: "分组测试",
    questions: [
      {
        id: "fill-1",
        type: "fill-in-blank",
        content: "水的化学式是 ___。",
        blanks: ["H2O"],
        score: 4,
      },
      {
        id: "choice-1",
        type: "single-choice",
        content: "选择正确答案。",
        options: ["A", "B"],
        correctAnswer: 0,
        score: 5,
      },
      {
        id: "essay-1",
        type: "essay",
        content: "论述题。",
        scoringCriteria: "观点清楚。",
        score: 12,
      },
    ],
  });
}

describe("paperSections", () => {
  it("groups questions by fixed type order and skips missing types", () => {
    const sections = groupQuestionsByType(makePaper());

    expect(sections.map((section) => section.type)).toEqual([
      "single-choice",
      "fill-in-blank",
      "essay",
    ]);
    expect(sections.map((section) => section.title)).toEqual([
      "一、单选题",
      "二、填空题",
      "三、论述题",
    ]);
    expect(sections.map((section) => section.score)).toEqual([5, 4, 12]);
  });

  it("falls back to arabic ordinal after the built-in CN list", () => {
    expect(cnOrdinal(0)).toBe("一");
    expect(cnOrdinal(10)).toBe("11");
  });

  it("uses structured English exam sections and shared passages", () => {
    const paper = ExamPaperSchema.parse({
      title: "六年级英语试卷",
      questions: [
        {
          id: "choice-1",
          type: "single-choice",
          content: "Choose the best answer.",
          options: ["A", "B"],
          correctAnswer: 0,
          examSection: { kind: "english-vocabulary-choice" },
          score: 4,
        },
        {
          id: "cloze-1",
          type: "single-choice",
          content: "1. ( )",
          options: ["was", "is"],
          correctAnswer: 1,
          examSection: {
            kind: "english-cloze",
            groupId: "cloze-a",
            passage: "Tom ___ a student.",
          },
          score: 4,
        },
        {
          id: "read-1",
          type: "single-choice",
          content: "What does Tom like?",
          options: ["Books", "Sports"],
          correctAnswer: 0,
          examSection: {
            kind: "english-reading",
            groupId: "reading-a",
            passage: "Tom likes books.",
          },
          score: 4,
        },
        {
          id: "translation-1",
          type: "short-answer",
          content: "Translate: 我喜欢英语。",
          referenceAnswer: "I like English.",
          examSection: { kind: "english-translation" },
          score: 6,
        },
        {
          id: "essay-1",
          type: "essay",
          content: "Write about your weekend.",
          scoringCriteria: "Clear structure and correct grammar.",
          examSection: { kind: "english-composition" },
          score: 15,
        },
      ],
    });

    const sections = groupQuestionsByType(paper);

    expect(sections.map((section) => section.title)).toEqual([
      "一、语法与词汇单选",
      "二、完形填空",
      "三、阅读理解",
      "四、翻译",
      "五、作文",
    ]);
    expect(sections.map((section) => section.passage)).toEqual([
      undefined,
      "Tom ___ a student.",
      "Tom likes books.",
      undefined,
      undefined,
    ]);
    expect(sections.map((section) => section.type)).toEqual([
      "single-choice",
      "single-choice",
      "single-choice",
      "short-answer",
      "essay",
    ]);
  });
});
