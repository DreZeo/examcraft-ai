import { describe, expect, it } from "vitest";
import { choiceDisplay } from "../exam/choiceDisplay";
import type { SingleChoiceQuestion } from "../types/exam";

describe("choiceDisplay", () => {
  it("strips inline options from the stem and keeps structured options", () => {
    const question: SingleChoiceQuestion = {
      id: "q1",
      type: "single-choice",
      content:
        "1. When did the modern Olympics begin? A) 1896 B) 776 BC C) 1900 D) 1920",
      options: ["1896", "776 BC", "1900", "1920"],
      correctAnswer: 0,
      score: 2,
    };

    expect(choiceDisplay(question)).toEqual({
      stem: "When did the modern Olympics begin?",
      options: ["1896", "776 BC", "1900", "1920"],
    });
  });

  it("uses embedded options when the structured options field is malformed", () => {
    const question = {
      id: "q1",
      type: "single-choice",
      content: "Choose one. A. Red B. Blue C. Green",
      options: undefined,
      correctAnswer: 1,
      score: 2,
    } as unknown as SingleChoiceQuestion;

    expect(choiceDisplay(question)).toEqual({
      stem: "Choose one.",
      options: ["Red", "Blue", "Green"],
    });
  });
});
