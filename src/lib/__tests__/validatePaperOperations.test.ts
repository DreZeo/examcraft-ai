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

const trueFalseQuestion = {
  id: "tf-1",
  type: "true-false",
  content: "Judge the statement.",
  correctAnswer: true,
  score: 6,
};

const cProgramQuestion = {
  id: "c-1",
  type: "short-answer",
  content:
    "【程序修改题】\n以下程序用于求最大公约数，请指出错误。\n\n```c\nint gcd(int a, int b) {\n    while (b = 0) {\n        a = b;\n    }\n    return b;\n}\n```",
  score: 15,
  referenceAnswer:
    "错误包括 `while (b = 0)` 应改为 `while (b != 0)`，循环结束后应返回 `a`。",
  scoringPoints: ["指出赋值与比较错误", "指出返回值错误"],
  explanation: "考察 C 语言循环条件与辗转相除法。",
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
      operations: [{ type: "appendQuestions", questions: [trueFalseQuestion] }],
    });

    const result = validatePaperOperations(
      reply,
      "append",
      inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("English language paper");
      expect(result.error).toContain("true-false");
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

  it("accepts fenced JSON containing C markdown code fences inside question text", () => {
    const reply = `\`\`\`json\n${JSON.stringify({
      operations: [{ type: "appendQuestions", questions: [cProgramQuestion] }],
    }, null, 2)}\n\`\`\``;

    const result = validatePaperOperations(reply, "append");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operations[0]).toMatchObject({
        type: "appendQuestions",
      });
    }
  });
});
