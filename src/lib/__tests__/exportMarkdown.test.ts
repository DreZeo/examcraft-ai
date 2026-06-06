import { describe, it, expect } from "vitest";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import { paperToMarkdown } from "../export/markdown";

function makePaper(): ExamPaper {
  return ExamPaperSchema.parse({
    title: "Sample Exam",
    metadata: { subject: "Math", className: "5A", duration: 90 },
    questions: [
      {
        id: "q1",
        type: "single-choice",
        content: "What is 2 + 2?",
        options: ["3", "4", "5"],
        correctAnswer: 1,
        explanation: "Basic addition.",
        score: 5,
      },
      {
        id: "q2",
        type: "single-choice",
        content: "Capital of France?\nA. Berlin\nB. Paris",
        options: ["Berlin", "Paris"],
        correctAnswer: 1,
        score: 5,
      },
      {
        id: "q3",
        type: "fill-in-blank",
        content: "Water is made of hydrogen and ___.",
        blanks: ["oxygen"],
        score: 4,
      },
      {
        id: "q4",
        type: "short-answer",
        content: "Explain gravity.",
        referenceAnswer: "A force of attraction between masses.",
        scoringPoints: ["mentions force", "mentions mass"],
        score: 8,
      },
    ],
  });
}

describe("paperToMarkdown", () => {
  it("includes the title and answers in the teacher variant", () => {
    const md = paperToMarkdown(makePaper(), { includeAnswers: true });
    expect(md).toContain("# Sample Exam");
    expect(md).toContain("【答案】");
    expect(md).toContain("B"); // single-choice index 1 -> B
    expect(md).toContain("oxygen"); // fill-in-blank answer
    expect(md).toContain("A force of attraction"); // reference answer
    expect(md).toContain("> **【解析】**");
    expect(md).toContain("> Basic addition.");
    expect(md).toContain("> **【评分要点】**");
    expect(md).toContain("> - mentions force");
  });

  it("excludes answers and explanations in the student variant", () => {
    const md = paperToMarkdown(makePaper(), { includeAnswers: false });
    expect(md).toContain("# Sample Exam");
    expect(md).not.toContain("【答案】");
    expect(md).not.toContain("【解析】");
    expect(md).not.toContain("oxygen");
    expect(md).not.toContain("A force of attraction");
    // Options still render so students can answer.
    expect(md).toContain("B. Paris");
    expect(md).toContain("__________"); // fill-in blanks render as answer lines.
    expect(md).toContain("> "); // subjective answer-space placeholders.
  });

  it("groups questions by type with CN ordinal numbered sections", () => {
    const md = paperToMarkdown(makePaper(), { includeAnswers: true });
    expect(md).toContain("## 一、单选题");
    expect(md).toContain("## 二、填空题");
    expect(md).toContain("## 三、简答题");
    // No essay/calculation section because the paper has none.
    expect(md).not.toContain("论述题");
    expect(md).not.toContain("计算题");
  });

  it("uses contextual English section labels in Markdown export", () => {
    const paper = ExamPaperSchema.parse({
      title: "六年级英语试卷",
      questions: [
        {
          id: "tf-1",
          type: "true-false",
          content: "Read the passage and judge the statement.",
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

    const md = paperToMarkdown(paper, { includeAnswers: true });

    expect(md).toContain("## 一、阅读理解判断");
    expect(md).toContain("## 二、完形填空");
    expect(md).toContain("## 三、作文");
  });

  it("restarts question numbering within each section", () => {
    const md = paperToMarkdown(makePaper(), { includeAnswers: true });
    const lines = md.split("\n");
    // Two single-choice questions numbered 1 and 2.
    expect(lines.some((l) => l.startsWith("1. What is 2 + 2?"))).toBe(true);
    expect(lines.some((l) => l.startsWith("2. Capital of France?"))).toBe(true);
    // First (and only) fill-in-blank question restarts at 1.
    expect(
      lines.some((l) => l.startsWith("1. Water is made of hydrogen")),
    ).toBe(true);
  });

  it("renders an exam-info header when header flags are provided", () => {
    const md = paperToMarkdown(makePaper(), {
      includeAnswers: true,
      header: {
        subject: true,
        className: true,
        studentName: true,
        duration: true,
        totalScore: true,
      },
    });
    expect(md).toContain("科目：Math");
    expect(md).toContain("班级：5A");
    expect(md).toContain("时长：90");
    // total score falls back to the sum of question scores (5+5+4+8 = 22)
    expect(md).toContain("总分：22");
    expect(md).toContain("---");
  });

  it("does not duplicate options already written in the question stem", () => {
    const md = paperToMarkdown(makePaper(), { includeAnswers: false });

    expect(md.match(/A\. Berlin/g)).toHaveLength(1);
    expect(md.match(/B\. Paris/g)).toHaveLength(1);
  });

  it("renders preview-like teacher answer blocks", () => {
    const md = paperToMarkdown(makePaper(), { includeAnswers: true });

    expect(md).toContain("> **【答案】**");
    expect(md).toContain("> B");
    expect(md).toContain("> **【评分要点】**");
    expect(md).toContain("> - mentions mass");
  });
});
