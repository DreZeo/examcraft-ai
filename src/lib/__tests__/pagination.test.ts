import { describe, expect, it } from "vitest";
import { defaultAppConfig } from "../types/config";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import {
  buildPaperBlocks,
  paginateBlocks,
  studentAnswerSpaceLines,
  studentBlankUnderlineLength,
} from "../exam/pagination";

const settings = defaultAppConfig().settings;

function makePaper(): ExamPaper {
  return ExamPaperSchema.parse({
    title: "分页测试",
    questions: [
      {
        id: "q1",
        type: "single-choice",
        content: "选择正确答案。",
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        score: 5,
      },
      {
        id: "q2",
        type: "essay",
        content: "请论述这一现象。",
        scoringCriteria: "观点明确，论证充分。",
        score: 20,
      },
    ],
  });
}

describe("pagination", () => {
  it("keeps a choice question and its options inside one question block", () => {
    const blocks = buildPaperBlocks(makePaper(), settings, false);
    const question = blocks.find((block) => block.id === "question-q1");

    expect(question?.kind).toBe("question");
    expect(question?.estimatedHeightMm).toBeGreaterThan(0);
    if (question?.kind === "question") {
      expect(question.question.type).toBe("single-choice");
      expect("options" in question.question && question.question.options)
        .toHaveLength(4);
    }
  });

  it("does not loop when a single question exceeds the available page height", () => {
    const paper = makePaper();
    const blocks = buildPaperBlocks(paper, settings, false);
    const pages = paginateBlocks(blocks, 1);

    expect(pages.length).toBeLessThanOrEqual(blocks.length);
    expect(pages.flatMap((page) => page.blocks)).toHaveLength(blocks.length);
    const sectionPage = pages.find((page) =>
      page.blocks.some((block) => block.id === "section-single-choice"),
    );
    expect(sectionPage?.blocks.map((block) => block.id)).toContain("question-q1");
  });

  it("estimates larger student answer space for essays than short answers", () => {
    const essay = makePaper().questions[1];
    const shortAnswer = ExamPaperSchema.parse({
      title: "x",
      questions: [
        {
          id: "q",
          type: "short-answer",
          content: "简答。",
          referenceAnswer: "略。",
          score: 6,
        },
      ],
    }).questions[0];

    expect(studentAnswerSpaceLines(essay)).toBeGreaterThan(
      studentAnswerSpaceLines(shortAnswer),
    );
  });

  it("uses longer blank lines for dense fill-in questions", () => {
    const question = ExamPaperSchema.parse({
      title: "x",
      questions: [
        {
          id: "q",
          type: "fill-in-blank",
          content: "请填写 ___、___、___。",
          blanks: ["a", "b", "c"],
          score: 6,
        },
      ],
    }).questions[0];

    expect(studentBlankUnderlineLength(question)).toBe(18);
  });
});
