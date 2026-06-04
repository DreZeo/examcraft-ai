import type { AiPaperOperation, ExamPaper, Question } from "../types/exam";

/**
 * Pure operations for mutating an exam paper. The AI returns only the questions
 * involved in a turn; these helpers define how they merge into the paper. All
 * edits (AI and manual) flow through these functions so the data path is single.
 */

/** Append questions to the end of the paper. */
export function appendQuestions(
  paper: ExamPaper,
  questions: Question[],
): ExamPaper {
  return { ...paper, questions: [...paper.questions, ...questions] };
}

/**
 * Replace questions by id. Any incoming question whose id matches an existing
 * one replaces it in place; incoming questions with no match are appended.
 */
export function replaceById(
  paper: ExamPaper,
  incoming: Question[],
): ExamPaper {
  const incomingById = new Map(incoming.map((q) => [q.id, q]));
  const matched = new Set<string>();

  const next = paper.questions.map((existing) => {
    const replacement = incomingById.get(existing.id);
    if (replacement) {
      matched.add(existing.id);
      return replacement;
    }
    return existing;
  });

  const appended = incoming.filter((q) => !matched.has(q.id));
  return { ...paper, questions: [...next, ...appended] };
}

/** Remove a question by id. */
export function removeQuestion(paper: ExamPaper, id: string): ExamPaper {
  return { ...paper, questions: paper.questions.filter((q) => q.id !== id) };
}

/** Move a question one position up or down (no-op at the boundaries). */
export function moveQuestion(
  paper: ExamPaper,
  id: string,
  direction: "up" | "down",
): ExamPaper {
  const index = paper.questions.findIndex((q) => q.id === id);
  if (index === -1) return paper;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= paper.questions.length) return paper;

  const next = [...paper.questions];
  [next[index], next[target]] = [next[target], next[index]];
  return { ...paper, questions: next };
}

/** Reorder existing questions by id, keeping omitted questions after the listed ids. */
export function reorderQuestions(
  paper: ExamPaper,
  questionIds: string[],
): ExamPaper {
  const byId = new Map(paper.questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const reordered: Question[] = [];

  for (const id of questionIds) {
    const question = byId.get(id);
    if (question && !seen.has(id)) {
      reordered.push(question);
      seen.add(id);
    }
  }

  const remaining = paper.questions.filter((q) => !seen.has(q.id));
  return { ...paper, questions: [...reordered, ...remaining] };
}

/** Replace a single question's fields in place (manual edit). */
export function updateQuestion(
  paper: ExamPaper,
  question: Question,
): ExamPaper {
  return {
    ...paper,
    questions: paper.questions.map((q) =>
      q.id === question.id ? question : q,
    ),
  };
}

/** Apply a validated AI operation batch to a paper. */
export function applyPaperOperations(
  paper: ExamPaper,
  operations: AiPaperOperation[],
): ExamPaper {
  return operations.reduce((current, operation) => {
    switch (operation.type) {
      case "renamePaper":
        return { ...current, title: operation.title };
      case "appendQuestions":
        return appendQuestions(current, operation.questions);
      case "updateQuestion":
        return replaceById(current, [operation.question]);
      case "deleteQuestion":
        return removeQuestion(current, operation.id);
      case "reorderQuestions":
        return reorderQuestions(current, operation.questionIds);
      default:
        return exhaustive(operation);
    }
  }, paper);
}

/** Sum of all question scores. */
export function totalScore(paper: ExamPaper): number {
  return paper.questions.reduce((sum, q) => sum + q.score, 0);
}

function exhaustive(value: never): never {
  throw new Error(`Unhandled paper operation: ${JSON.stringify(value)}`);
}
