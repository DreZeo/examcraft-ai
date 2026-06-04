import { describe, it, expect } from "vitest";
import type { ExamPaper, Question } from "../types/exam";
import {
  appendQuestions,
  applyPaperOperations,
  replaceById,
  removeQuestion,
  moveQuestion,
  reorderQuestions,
  updateQuestion,
  totalScore,
} from "../exam/merge";
import {
  countPaperOperationChanges,
  previewPaperOperations,
} from "../exam/operationPreview";
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

  it("reorders questions by id and keeps omitted questions at the end", () => {
    const base = paper([sc("q1"), sc("q2"), sc("q3")]);
    const p = reorderQuestions(base, ["q3", "missing", "q1"]);
    expect(p.questions.map((q) => q.id)).toEqual(["q3", "q1", "q2"]);
  });

  it("updates a single question in place", () => {
    const edited = { ...sc("q1"), content: "edited" };
    const p = updateQuestion(paper([sc("q1"), sc("q2")]), edited);
    expect(p.questions[0].content).toBe("edited");
  });

  it("sums total score", () => {
    expect(totalScore(paper([sc("q1", 5), sc("q2", 10)]))).toBe(15);
  });

  it("applies mixed AI paper operations in order", () => {
    const base = paper([sc("q1"), sc("q2"), sc("q3")]);
    const p = applyPaperOperations(base, [
      { type: "renamePaper", title: "六年级英语试卷" },
      { type: "deleteQuestion", id: "q2" },
      {
        type: "updateQuestion",
        id: "q1",
        question: { ...sc("q1"), content: "updated" },
      },
      { type: "appendQuestions", questions: [sc("q4")] },
      { type: "reorderQuestions", questionIds: ["q4", "q1"] },
    ]);

    expect(p.title).toBe("六年级英语试卷");
    expect(p.questions.map((q) => q.id)).toEqual(["q4", "q1", "q3"]);
    expect(p.questions[1].content).toBe("updated");
  });
});

describe("paper operation preview", () => {
  it("summarizes mixed AI paper operations without applying them", () => {
    const preview = previewPaperOperations([
      { type: "renamePaper", title: "六年级英语试卷" },
      { type: "appendQuestions", questions: [sc("q4")] },
      {
        type: "updateQuestion",
        id: "q1",
        question: { ...sc("q1"), content: "updated" },
      },
      { type: "deleteQuestion", id: "q2" },
      { type: "reorderQuestions", questionIds: ["q4", "q1", "q3"] },
    ]);

    expect(preview.rename?.title).toBe("六年级英语试卷");
    expect(preview.added.map((q) => q.id)).toEqual(["q4"]);
    expect(preview.updated.map((q) => q.id)).toEqual(["q1"]);
    expect(preview.deleted).toEqual(["q2"]);
    expect(preview.reordered).toEqual(["q4", "q1", "q3"]);
    expect(countPaperOperationChanges(preview)).toBe(5);
  });

  it("keeps legacy generated questions in the added bucket", () => {
    const preview = previewPaperOperations([], [sc("legacy")]);

    expect(preview.added.map((q) => q.id)).toEqual(["legacy"]);
    expect(countPaperOperationChanges(preview)).toBe(1);
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
