import { describe, it, expect } from "vitest";
import {
  ExamPaperSchema,
  QuestionSchema,
  AiQuestionsResponseSchema,
  isObjective,
  PAPER_SCHEMA_VERSION,
} from "../types/exam";

describe("QuestionSchema", () => {
  it("accepts a valid single-choice question", () => {
    const q = {
      id: "q1",
      type: "single-choice",
      content: "What is 2 + 2?",
      options: ["3", "4", "5"],
      correctAnswer: 1,
      score: 5,
    };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });

  it("rejects a single-choice question with too few options", () => {
    const q = {
      id: "q1",
      type: "single-choice",
      content: "Bad",
      options: ["only one"],
      correctAnswer: 0,
      score: 5,
    };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });

  it("rejects an unknown question type", () => {
    const q = { id: "q1", type: "matching", content: "x", score: 1 };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });

  it("accepts a calculation question with solution and answer", () => {
    const q = {
      id: "q2",
      type: "calculation",
      content: "Integrate $x^2$",
      solution: "Apply the power rule",
      answer: "$x^3/3 + C$",
      score: 10,
    };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });
});

describe("ExamPaperSchema", () => {
  it("defaults version when omitted", () => {
    const parsed = ExamPaperSchema.parse({ title: "Test", questions: [] });
    expect(parsed.version).toBe(PAPER_SCHEMA_VERSION);
  });
});

describe("AiQuestionsResponseSchema", () => {
  it("validates a questions-only payload", () => {
    const payload = {
      questions: [
        {
          id: "q1",
          type: "true-false",
          content: "The sky is blue.",
          correctAnswer: true,
          score: 2,
        },
      ],
    };
    expect(AiQuestionsResponseSchema.safeParse(payload).success).toBe(true);
  });
});

describe("isObjective", () => {
  it("classifies objective vs subjective types", () => {
    expect(isObjective("single-choice")).toBe(true);
    expect(isObjective("fill-in-blank")).toBe(true);
    expect(isObjective("essay")).toBe(false);
    expect(isObjective("calculation")).toBe(false);
  });
});
