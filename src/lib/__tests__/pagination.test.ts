import { describe, expect, it } from "vitest";
import { defaultAppConfig } from "../types/config";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import {
  buildPaperBlocks,
  getPageMetrics,
  paginateMeasuredBlocks,
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

  it("uses measured heights to avoid premature page breaks with useful space left", () => {
    const blocks = buildPaperBlocks(makePaper(), settings, false);
    const heights = Object.fromEntries(
      blocks.map((block) => [block.id, block.estimatedHeightMm]),
    );
    const q2 = blocks.find((block) => block.id === "question-q2");
    expect(q2?.kind).toBe("question");
    heights["question-q1"] = 30;
    heights["section-essay"] = 8;
    heights["question-q2"] = 35;

    const pages = paginateMeasuredBlocks(blocks, 120, heights);

    expect(pages[0].blocks.map((block) => block.id)).toContain("question-q2");
  });

  it("counts block gaps when paginating measured preview blocks", () => {
    const blocks = buildPaperBlocks(makePaper(), settings, false).slice(0, 3);
    const heights = Object.fromEntries(blocks.map((block) => [block.id, 10]));

    const pages = paginateMeasuredBlocks(blocks, 25, heights, 5);

    expect(pages.map((page) => page.blocks.map((block) => block.id))).toEqual([
      [blocks[0].id, blocks[1].id],
      [blocks[2].id],
    ]);
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

  it("swaps page dimensions and content height for landscape orientation", () => {
    const metrics = getPageMetrics({
      ...settings,
      paperSize: "a4",
      paperOrientation: "landscape",
      paperMargin: "normal",
    });

    expect(metrics.width).toBe("297mm");
    expect(metrics.height).toBe("210mm");
    expect(metrics.padding).toBe("25.4mm 31.8mm 25.4mm 31.8mm");
    expect(metrics.contentHeightMm).toBeCloseTo(159.2);
  });
});
