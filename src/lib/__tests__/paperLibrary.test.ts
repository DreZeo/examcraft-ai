import { describe, expect, it } from "vitest";
import { ExamPaperSchema } from "../types/exam";
import {
  createPaperIndex,
  removePaperMeta,
  renamePaperMeta,
  upsertPaperMeta,
} from "../exam/paperLibrary";

const paper = ExamPaperSchema.parse({
  title: "Alpha",
  questions: [
    {
      id: "q1",
      type: "single-choice",
      content: "One",
      options: ["A", "B"],
      correctAnswer: 0,
      score: 1,
    },
  ],
});

describe("paper library helpers", () => {
  it("creates an index from an existing working paper", () => {
    const { index, paperId } = createPaperIndex(paper, "2026-01-01T00:00:00Z", "p1");

    expect(paperId).toBe("p1");
    expect(index.activePaperId).toBe("p1");
    expect(index.papers[0]).toMatchObject({
      id: "p1",
      title: "Alpha",
      questionCount: 1,
    });
  });

  it("renames, updates and removes metadata while preserving fallback active paper", () => {
    let index = createPaperIndex(paper, "2026-01-01T00:00:00Z", "p1").index;
    index = upsertPaperMeta(
      index,
      "p2",
      { ...paper, title: "Beta", questions: [] },
      "2026-01-02T00:00:00Z",
    );
    index = renamePaperMeta(index, "p2", "Beta renamed", "2026-01-03T00:00:00Z");

    expect(index.papers[0].title).toBe("Beta renamed");

    index = removePaperMeta(index, "p2");
    expect(index.activePaperId).toBe("p1");
    expect(index.papers).toHaveLength(1);
  });
});
