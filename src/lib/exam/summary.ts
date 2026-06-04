import type { ExamPaper, Question } from "../types/exam";

/**
 * Build a compact, token-bounded summary of the current paper to inject into the
 * AI context each turn. Lets the assistant be paper-aware (avoid duplicates, fill
 * to a target score, edit a specific question) without sending full question text.
 *
 * MVP strategy: simple truncation — type + stem excerpt + score per question.
 */

const DEFAULT_STEM_CHARS = 40;

export function summarizePaper(
  paper: ExamPaper,
  stemChars: number = DEFAULT_STEM_CHARS,
): string {
  if (paper.questions.length === 0) {
    return "The paper is currently empty.";
  }

  const lines = paper.questions.map(
    (q, i) => `${i + 1}. [${q.type}] (${q.score} pts) id=${q.id} ${stem(q, stemChars)}`,
  );

  const total = paper.questions.reduce((sum, q) => sum + q.score, 0);
  return [
    `Title: ${paper.title}`,
    `Questions: ${paper.questions.length}, total ${total} pts`,
    ...lines,
  ].join("\n");
}

function stem(q: Question, max: number): string {
  const flat = q.content.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
