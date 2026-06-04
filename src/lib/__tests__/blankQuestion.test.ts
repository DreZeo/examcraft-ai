import { describe, it, expect } from "vitest";
import { QuestionSchema, type QuestionType } from "../types/exam";
import {
  createBlankQuestion,
  changeQuestionType,
} from "../exam/blankQuestion";

const ALL_TYPES: QuestionType[] = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "fill-in-blank",
  "short-answer",
  "essay",
  "calculation",
];

describe("createBlankQuestion", () => {
  it("produces a schema-valid question for every type", () => {
    for (const type of ALL_TYPES) {
      const q = createBlankQuestion(type, `id-${type}`);
      const result = QuestionSchema.safeParse(q);
      expect(result.success, `${type}: ${JSON.stringify(result)}`).toBe(true);
      expect(q.id).toBe(`id-${type}`);
      expect(q.type).toBe(type);
      expect(q.score).toBeGreaterThan(0);
    }
  });

  it("gives choice types two empty options", () => {
    const q = createBlankQuestion("single-choice", "x");
    expect("options" in q && q.options).toEqual(["", ""]);
  });
});

describe("changeQuestionType", () => {
  it("preserves id, content and score while resetting type fields", () => {
    const draft = createBlankQuestion("single-choice", "keep");
    draft.content = "stem text";
    draft.score = 12;

    const next = changeQuestionType(draft, "calculation");
    expect(next.id).toBe("keep");
    expect(next.content).toBe("stem text");
    expect(next.score).toBe(12);
    expect(next.type).toBe("calculation");
    expect(QuestionSchema.safeParse(next).success).toBe(true);
  });

  it("stays valid across all type transitions", () => {
    const start = createBlankQuestion("essay", "t");
    for (const type of ALL_TYPES) {
      const next = changeQuestionType(start, type);
      expect(QuestionSchema.safeParse(next).success, type).toBe(true);
    }
  });
});
