import type { ExamPaper, Question } from "../types/exam";

/**
 * Produce a student-facing copy of the paper: answers, explanations, solutions
 * and scoring guidance removed. Used for the on-screen student preview and the
 * student-version export. The teacher version is the paper as stored.
 *
 * Pure: returns a new paper, never mutates the input.
 */
export function toStudentVersion(paper: ExamPaper): ExamPaper {
  return { ...paper, questions: paper.questions.map(stripAnswer) };
}

function stripAnswer(q: Question): Question {
  switch (q.type) {
    case "single-choice": {
      const { correctAnswer: _c, explanation: _e, ...rest } = q;
      return rest as Question;
    }
    case "multiple-choice": {
      const { correctAnswers: _c, explanation: _e, ...rest } = q;
      return rest as Question;
    }
    case "true-false": {
      const { correctAnswer: _c, explanation: _e, ...rest } = q;
      return rest as Question;
    }
    case "fill-in-blank": {
      const { blanks: _b, explanation: _e, ...rest } = q;
      return { ...rest, blanks: q.blanks.map(() => "") } as Question;
    }
    case "short-answer": {
      const {
        referenceAnswer: _r,
        scoringPoints: _s,
        explanation: _e,
        ...rest
      } = q;
      return rest as Question;
    }
    case "essay": {
      const { scoringCriteria: _s, explanation: _e, ...rest } = q;
      return rest as Question;
    }
    case "calculation": {
      const { solution: _s, answer: _a, explanation: _e, ...rest } = q;
      return rest as Question;
    }
  }
}
