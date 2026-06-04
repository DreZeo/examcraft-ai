import { describe, it, expect } from "vitest";
import type { ExamPaper, Question } from "../types/exam";
import {
  appendQuestions,
  replaceById,
  removeQuestion,
  moveQuestion,
  updateQuestion,
  totalScore,
} from "../exam/merge";
import { toStudentVersion } from "../exam/studentVersion";
import { summarizePaper } from "../exam/summary";

function sc(id: string, score = 5): Question {
  return {
    id,
    type: "single-choice",
    content: `Question ${id}`,
    options: ["a", "b"],
    correctAnswer: 0,
    explanation: `because ${id}`,
    score,
  };
}

function paper(questions: Question[]): ExamPaper {
  return { version: 1, title: "Test", questions };
}

describe("merge operations", () => {
  it("appends questions to the end", () => {
    const p = appendQuestions(paper([sc("q1")]), [sc("q2")]);
    expect(p.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
  });

  it("replaces a question by id in place", () => {
    const replacement = { ...sc("q1"), content: "updated" };
    const p = replaceById(paper([sc("q1"), sc("q2")]), [replacement]);
    expect(p.questions[0].content).toBe("updated");
    expect(p.questions).toHaveLength(2);
  });

  it("appends incoming questions with no id match", () => {
    const p = replaceById(paper([sc("q1")]), [sc("q9")]);
    expect(p.questions.map((q) => q.id)).toEqual(["q1", "q9"]);
  });

  it("removes a question by id", () => {
    const p = removeQuestion(paper([sc("q1"), sc("q2")]), "q1");
    expect(p.questions.map((q) => q.id)).toEqual(["q2"]);
  });

  it("moves a question up and down within bounds", () => {
    const base = paper([sc("q1"), sc("q2"), sc("q3")]);
    expect(moveQuestion(base, "q2", "up").questions.map((q) => q.id)).toEqual([
      "q2",
      "q1",
      "q3",
    ]);
    expect(
      moveQuestion(base, "q2", "down").questions.map((q) => q.id),
    ).toEqual(["q1", "q3", "q2"]);
  });

  it("does not move past the boundaries", () => {
    const base = paper([sc("q1"), sc("q2")]);
    expect(moveQuestion(base, "q1", "up").questions.map((q) => q.id)).toEqual([
      "q1",
      "q2",
    ]);
  });

  it("updates a single question in place", () => {
    const edited = { ...sc("q1"), content: "edited" };
    const p = updateQuestion(paper([sc("q1"), sc("q2")]), edited);
    expect(p.questions[0].content).toBe("edited");
  });

  it("sums total score", () => {
    expect(totalScore(paper([sc("q1", 5), sc("q2", 10)]))).toBe(15);
  });
});

describe("toStudentVersion", () => {
  it("strips correctAnswer and explanation from choice questions", () => {
    const student = toStudentVersion(paper([sc("q1")]));
    const q = student.questions[0] as Record<string, unknown>;
    expect(q.correctAnswer).toBeUndefined();
    expect(q.explanation).toBeUndefined();
    expect(q.options).toEqual(["a", "b"]);
  });

  it("blanks out fill-in-blank answers but keeps blank count", () => {
    const fib: Question = {
      id: "f1",
      type: "fill-in-blank",
      content: "___ and ___",
      blanks: ["sky", "blue"],
      score: 4,
    };
    const student = toStudentVersion(paper([fib]));
    const q = student.questions[0] as Record<string, unknown>;
    expect(q.blanks).toEqual(["", ""]);
  });

  it("does not mutate the original paper", () => {
    const original = paper([sc("q1")]);
    toStudentVersion(original);
    expect(
      (original.questions[0] as Record<string, unknown>).correctAnswer,
    ).toBe(0);
  });
});

describe("summarizePaper", () => {
  it("reports empty papers", () => {
    expect(summarizePaper(paper([]))).toContain("empty");
  });

  it("includes count, total score and per-question lines", () => {
    const s = summarizePaper(paper([sc("q1", 5), sc("q2", 10)]));
    expect(s).toContain("Questions: 2, total 15 pts");
    expect(s).toContain("id=q1");
    expect(s).toContain("id=q2");
  });

  it("truncates long stems", () => {
    const long = { ...sc("q1"), content: "x".repeat(100) };
    const s = summarizePaper(paper([long]), 10);
    expect(s).toContain("…");
    expect(s).not.toContain("x".repeat(100));
  });
});
