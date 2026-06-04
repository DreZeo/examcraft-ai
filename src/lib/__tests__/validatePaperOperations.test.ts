import { describe, it, expect } from "vitest";
import { validatePaperOperations } from "../api/validatePaperOperations";

const validQuestion = {
  id: "q1",
  type: "single-choice",
  content: "What is 2 + 2?",
  options: ["3", "4"],
  correctAnswer: 1,
  score: 5,
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
});
