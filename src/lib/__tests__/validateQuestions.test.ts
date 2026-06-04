import { describe, it, expect } from "vitest";
import { validateQuestions } from "../api/validateQuestions";

const validQuestion = {
  id: "q1",
  type: "single-choice",
  content: "What is 2 + 2?",
  options: ["3", "4", "5"],
  correctAnswer: 1,
  score: 5,
};

describe("validateQuestions", () => {
  it("returns ok with the parsed questions for a valid fenced payload", () => {
    const reply = `好的：\n\`\`\`json\n${JSON.stringify({ questions: [validQuestion] })}\n\`\`\``;
    const result = validateQuestions(reply);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe("q1");
    }
  });

  it("works on a bare JSON object without a fence", () => {
    const reply = JSON.stringify({ questions: [validQuestion] });
    const result = validateQuestions(reply);
    expect(result.ok).toBe(true);
  });

  it("fails when no JSON block is present", () => {
    const result = validateQuestions("I need more details before I can generate.");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no json/i);
      expect(result.raw).toContain("more details");
    }
  });

  it("fails with a syntax message for malformed JSON", () => {
    const reply = '```json\n{"questions": [ }\n```';
    const result = validateQuestions(reply);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid json syntax/i);
  });

  it("formats a missing-field zod error with the question number", () => {
    const bad = { ...validQuestion } as Record<string, unknown>;
    delete bad.score;
    const reply = `\`\`\`json\n${JSON.stringify({ questions: [bad] })}\n\`\`\``;
    const result = validateQuestions(reply);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/^Question 1: score /m);
      expect(result.raw).toBe(reply);
    }
  });

  it("formats a top-level error (missing questions array)", () => {
    const reply = '```json\n{"foo": 1}\n```';
    const result = validateQuestions(reply);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/questions/);
  });

  it("reports the offending index for the second of several questions", () => {
    const bad = { ...validQuestion, id: "q2", correctAnswer: "nope" };
    const reply = `\`\`\`json\n${JSON.stringify({
      questions: [validQuestion, bad],
    })}\n\`\`\``;
    const result = validateQuestions(reply);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^Question 2: /m);
  });
});
