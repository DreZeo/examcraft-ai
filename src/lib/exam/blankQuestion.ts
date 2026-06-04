import type { Question, QuestionType } from "../types/exam";

/** Default score assigned to a freshly created question. */
const DEFAULT_SCORE = 5;

/**
 * Build a blank, schema-valid question of the given type. Used for "add
 * question manually" — the store generates the id, this fills sensible
 * defaults that pass QuestionSchema so the new block renders immediately.
 */
export function createBlankQuestion(
  type: QuestionType,
  id: string,
): Question {
  const base = { id, content: "", score: DEFAULT_SCORE };
  switch (type) {
    case "single-choice":
      return { ...base, type, options: ["", ""], correctAnswer: 0 };
    case "multiple-choice":
      return { ...base, type, options: ["", ""], correctAnswers: [0] };
    case "true-false":
      return { ...base, type, correctAnswer: true };
    case "fill-in-blank":
      return { ...base, type, blanks: [""] };
    case "short-answer":
      return { ...base, type, referenceAnswer: "" };
    case "essay":
      return { ...base, type, scoringCriteria: "" };
    case "calculation":
      return { ...base, type, solution: "", answer: "" };
  }
}

/**
 * Change a draft question's type while preserving its id, Markdown content and
 * score. Type-specific fields are reset to the new type's blank defaults.
 */
export function changeQuestionType(
  draft: Question,
  type: QuestionType,
): Question {
  return {
    ...createBlankQuestion(type, draft.id),
    content: draft.content,
    score: draft.score,
  };
}
