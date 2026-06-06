import { describe, expect, it } from "vitest";
import type { AiPaperOperation, Question } from "../types/exam";
import {
  formatQuestionTypeStrategy,
  inferQuestionTypeStrategy,
  validateQuestionTypeStrategy,
} from "../exam/questionTypeStrategy";

function question(type: Question["type"], id = type): Question {
  switch (type) {
    case "single-choice":
      return {
        id,
        type,
        content: "Choose the best answer.",
        score: 2,
        options: ["A", "B"],
        correctAnswer: 0,
      };
    case "multiple-choice":
      return {
        id,
        type,
        content: "Choose all correct answers.",
        score: 2,
        options: ["A", "B"],
        correctAnswers: [0],
      };
    case "true-false":
      return { id, type, content: "True or false.", score: 2, correctAnswer: true };
    case "fill-in-blank":
      return { id, type, content: "Fill ___.", score: 2, blanks: ["blank"] };
    case "short-answer":
      return {
        id,
        type,
        content: "Answer briefly.",
        score: 4,
        referenceAnswer: "Reference answer.",
      };
    case "essay":
      return {
        id,
        type,
        content: "Discuss.",
        score: 10,
        scoringCriteria: "Clear argument.",
      };
    case "calculation":
      return {
        id,
        type,
        content: "Calculate.",
        score: 6,
        solution: "Step 1.",
        answer: "42",
      };
  }
}

function append(...questions: Question[]): AiPaperOperation[] {
  return [{ type: "appendQuestions", questions }];
}

describe("question type strategy", () => {
  it("detects English language papers from user requests", () => {
    const match = inferQuestionTypeStrategy({
      requestText: "帮我生成一份六年级英语试卷",
    });

    expect(match?.strategy.id).toBe("english-language");
    expect(match?.strategy.defaultExcludedTypes).toContain("short-answer");
    expect(match?.strategy.defaultExcludedTypes).not.toContain("essay");
  });

  it("formats prompt guidance for the active strategy", () => {
    const guidance = formatQuestionTypeStrategy(
      inferQuestionTypeStrategy({ requestText: "初一数学函数测试" }),
    );

    expect(guidance).toContain("Mathematics paper");
    expect(guidance).toContain("Preferred question types");
    expect(guidance).toContain("calculation");
  });

  it("rejects default-excluded question types when context is clear", () => {
    const match = inferQuestionTypeStrategy({
      requestText: "帮我生成一份六年级英语试卷",
    });
    const result = validateQuestionTypeStrategy(
      append(question("single-choice"), question("short-answer")),
      match,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("English language paper");
      expect(result.error).toContain("short-answer");
    }
  });

  it("allows English composition by default", () => {
    const match = inferQuestionTypeStrategy({
      requestText: "帮我生成一份六年级英语试卷",
    });
    const result = validateQuestionTypeStrategy(append(question("essay")), match);

    expect(result.ok).toBe(true);
  });

  it("allows excluded types when the user explicitly asks for them", () => {
    const match = inferQuestionTypeStrategy({
      requestText: "帮我生成一份英语阅读理解简答题专项试卷",
    });
    const result = validateQuestionTypeStrategy(
      append(question("short-answer")),
      match,
    );

    expect(result.ok).toBe(true);
  });

  it("does not validate when no subject strategy is detected", () => {
    const result = validateQuestionTypeStrategy(
      append(question("essay"), question("calculation")),
      inferQuestionTypeStrategy({ requestText: "生成一份综合练习" }),
    );

    expect(result.ok).toBe(true);
  });
});
