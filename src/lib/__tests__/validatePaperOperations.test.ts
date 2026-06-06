import { describe, it, expect } from "vitest";
import { validatePaperOperations } from "../api/validatePaperOperations";
import { inferQuestionTypeStrategy } from "../exam/questionTypeStrategy";

const validQuestion = {
  id: "q1",
  type: "single-choice",
  content: "What is 2 + 2?",
  options: ["3", "4"],
  correctAnswer: 1,
  score: 5,
};

const essayQuestion = {
  id: "essay-1",
  type: "essay",
  content: "Discuss your opinion.",
  scoringCriteria: "Clear argument.",
  score: 10,
};

const shortAnswerQuestion = {
  id: "short-1",
  type: "short-answer",
  content: "Answer briefly.",
  referenceAnswer: "Reference answer.",
  score: 6,
};

describe("validatePaperOperations", () => {
  it("returns operations for a valid fenced payload", () => {
    const reply = `\`\`\`json\n${JSON.stringify({
      operations: [
        { type: "renamePaper", title: "六年级英语试卷" },
        { type: "appendQuestions", questions: [validQuestion] },
      ],
    })}\n\`\`\``;

    const result = validatePaperOperations(reply, "append");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].type).toBe("renamePaper");
    }
  });

  it("converts legacy questions to append operations", () => {
    const reply = JSON.stringify({ questions: [validQuestion] });
    const result = validatePaperOperations(reply, "append");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations).toEqual([
        { type: "appendQuestions", questions: [validQuestion] },
      ]);
    }
  });

  it("converts legacy questions to update operations in replace mode", () => {
    const reply = JSON.stringify({ questions: [validQuestion] });
    const result = validatePaperOperations(reply, "replace");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations).toEqual([
        { type: "updateQuestion", id: "q1", question: validQuestion },
      ]);
    }
  });

  it("fails when neither operations nor legacy questions are valid", () => {
    const result = validatePaperOperations('{"foo": 1}', "append");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/operations array/i);
      expect(result.raw).toBe('{"foo": 1}');
    }
  });

  it("rejects update operations whose id does not match question.id", () => {
    const reply = JSON.stringify({
      operations: [
        {
          type: "updateQuestion",
          id: "q1",
          question: { ...validQuestion, id: "q2" },
        },
      ],
    });

    const result = validatePaperOperations(reply, "replace");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/id must match question.id/i);
    }
  });

  it("rejects generated question types that violate the active strategy", () => {
    const reply = JSON.stringify({
      operations: [{ type: "appendQuestions", questions: [shortAnswerQuestion] }],
    });

    const result = validatePaperOperations(
      reply,
      "append",
      inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("English language paper");
      expect(result.error).toContain("short-answer");
    }
  });

  it("allows English composition by default", () => {
    const reply = JSON.stringify({
      operations: [{ type: "appendQuestions", questions: [essayQuestion] }],
    });

    const result = validatePaperOperations(
      reply,
      "append",
      inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" }),
    );

    expect(result.ok).toBe(true);
  });
});
