import type { Question } from "../types/exam";

/**
 * Human-readable answer string for a question: option letters for choices,
 * ✓/✗ for true-false, joined blanks, or the reference answer / scoring text for
 * subjective types. Shared by the on-screen answer block and the Markdown export
 * so both stay in sync.
 *
 * Only meaningful for teacher-version questions (those that still carry their
 * answer fields); never call it on a student-version question.
 */
export function formatAnswer(q: Question): string {
  switch (q.type) {
    case "single-choice":
      return String.fromCharCode(65 + q.correctAnswer);
    case "multiple-choice":
      return q.correctAnswers
        .map((i) => String.fromCharCode(65 + i))
        .join(", ");
    case "true-false":
      return q.correctAnswer ? "✓" : "✗";
    case "fill-in-blank":
      return q.blanks.join(" / ");
    case "short-answer":
      return q.referenceAnswer;
    case "essay":
      return q.scoringCriteria;
    case "calculation":
      return q.answer;
  }
}
