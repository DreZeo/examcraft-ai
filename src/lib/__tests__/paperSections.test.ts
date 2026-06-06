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

  it("uses contextual English exam section labels", () => {
    const paper = ExamPaperSchema.parse({
      title: "六年级英语试卷",
      questions: [
        {
          id: "tf-1",
          type: "true-false",
          content: "Read the passage and judge.",
          correctAnswer: true,
          score: 4,
        },
        {
          id: "fill-1",
          type: "fill-in-blank",
          content: "Complete the cloze passage: ___.",
          blanks: ["word"],
          score: 6,
        },
        {
          id: "essay-1",
          type: "essay",
          content: "Write about your weekend.",
          scoringCriteria: "Clear structure and correct grammar.",
          score: 15,
        },
      ],
    });

    expect(groupQuestionsByType(paper).map((section) => section.title)).toEqual([
      "一、阅读理解判断",
      "二、完形填空",
      "三、作文",
    ]);
  });
});
