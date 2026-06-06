import {
  PAPER_FONT_SIZE_STYLES,
  PAPER_LINE_HEIGHT_STYLES,
  PAPER_MARGIN_STYLES,
  PAPER_SIZE_STYLES,
  type AppSettings,
} from "../types/config";
import type { ExamPaper, Question } from "../types/exam";
import {
  groupQuestionsByType,
  type PaperQuestionSection,
} from "./paperSections";

export type PaperLayoutBlock =
  | { kind: "title"; id: string; title: string; estimatedHeightMm: number }
  | { kind: "exam-info"; id: string; estimatedHeightMm: number }
  | {
      kind: "section";
      id: string;
      section: PaperQuestionSection;
      estimatedHeightMm: number;
    }
  | {
      kind: "question";
      id: string;
      question: Question;
      number: number;
      estimatedHeightMm: number;
    };

export interface PaperPage {
  id: string;
  blocks: PaperLayoutBlock[];
}

export type BlockHeightMap = Record<string, number>;

export interface PageMetrics {
  width: string;
  height: string;
  padding: string;
  contentHeightMm: number;
}

const PT_TO_MM = 0.352778;

export function getPageMetrics(settings: AppSettings): PageMetrics {
  const size = PAPER_SIZE_STYLES[settings.paperSize];
  const marginMm = parseMm(PAPER_MARGIN_STYLES[settings.paperMargin]);
  return {
    width: size.width,
    height: size.minHeight,
    padding: PAPER_MARGIN_STYLES[settings.paperMargin],
    contentHeightMm: Math.max(40, parseMm(size.minHeight) - marginMm * 2),
  };
}

export function buildPaperBlocks(
  paper: ExamPaper,
  settings: AppSettings,
  includeAnswers: boolean,
): PaperLayoutBlock[] {
  const blocks: PaperLayoutBlock[] = [];
  if ((paper.title ?? "").trim()) {
    blocks.push({
      kind: "title",
      id: "title",
      title: paper.title,
      estimatedHeightMm: 18,
    });
  }
  if (paper.questions.length > 0) {
    blocks.push({
      kind: "exam-info",
      id: "exam-info",
      estimatedHeightMm: 15,
    });
  }

  for (const section of groupQuestionsByType(paper)) {
    blocks.push({
      kind: "section",
      id: `section-${section.type}`,
      section,
      estimatedHeightMm: 12,
    });
    section.questions.forEach((question, index) => {
      blocks.push({
        kind: "question",
        id: `question-${question.id}`,
        question,
        number: index + 1,
        estimatedHeightMm: estimateQuestionHeightMm(
          question,
          settings,
          includeAnswers,
        ),
      });
    });
  }

  return blocks;
}

export function paginateBlocks(
  blocks: PaperLayoutBlock[],
  contentHeightMm: number,
): PaperPage[] {
  return paginateMeasuredBlocks(
    blocks,
    contentHeightMm,
    Object.fromEntries(
      blocks.map((block) => [block.id, Math.max(1, block.estimatedHeightMm)]),
    ),
  );
}

export function paginateMeasuredBlocks(
  blocks: PaperLayoutBlock[],
  contentHeightMm: number,
  heights: BlockHeightMap,
): PaperPage[] {
  if (blocks.length === 0) return [];

  const pages: PaperPage[] = [];
  let current: PaperLayoutBlock[] = [];
  let used = 0;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const height = blockHeight(block, heights);
    const next = blocks[index + 1];
    const sectionWithFirstQuestion =
      block.kind === "section" && next?.kind === "question"
        ? height + blockHeight(next, heights)
        : height;
    const followsCurrentSection =
      block.kind === "question" &&
      current.length === 1 &&
      current[0].kind === "section";
    const isOversized = height > contentHeightMm;
    const shouldStartNewPage =
      current.length > 0 &&
      used + sectionWithFirstQuestion > contentHeightMm + 1 &&
      !isOversized &&
      !followsCurrentSection;

    if (shouldStartNewPage) {
      pages.push({ id: `page-${pages.length + 1}`, blocks: current });
      current = [];
      used = 0;
    }

    current.push(block);
    used += height;
  }

  if (current.length > 0) {
    pages.push({ id: `page-${pages.length + 1}`, blocks: current });
  }

  return pages;
}

export function buildPaperPages(
  paper: ExamPaper,
  settings: AppSettings,
  includeAnswers: boolean,
): PaperPage[] {
  const metrics = getPageMetrics(settings);
  return paginateBlocks(
    buildPaperBlocks(paper, settings, includeAnswers),
    metrics.contentHeightMm,
  );
}

export function studentAnswerSpaceLines(question: Question): number {
  switch (question.type) {
    case "essay":
      return clamp(Math.ceil(question.score / 4) + 4, 6, 14);
    case "short-answer":
      return clamp(Math.ceil(question.score / 5) + 2, 3, 7);
    case "calculation":
      return clamp(Math.ceil(question.score / 5) + 3, 4, 9);
    default:
      return 0;
  }
}

export function studentBlankUnderlineLength(question: Question): number {
  if (question.type !== "fill-in-blank") return 0;
  const count = Array.isArray(question.blanks) ? question.blanks.length : 1;
  if (count >= 3 || question.content.length > 80) return 18;
  if (count === 2 || question.content.length > 40) return 14;
  return 10;
}

function estimateQuestionHeightMm(
  question: Question,
  settings: AppSettings,
  includeAnswers: boolean,
): number {
  const lineHeightMm = fontLineHeightMm(settings);
  let lines = 2 + estimateTextLines(question.content);

  if ("options" in question) {
    const options = Array.isArray(question.options) ? question.options : [];
    lines += options.reduce(
      (sum, option) => sum + Math.max(1, estimateTextLines(option)),
      0,
    );
  }

  if (includeAnswers) {
    lines += estimateTeacherAnswerLines(question);
  } else {
    lines += studentAnswerSpaceLines(question);
  }

  return Math.ceil(lines * lineHeightMm + 4);
}

function estimateTeacherAnswerLines(question: Question): number {
  const explanation =
    "explanation" in question && question.explanation
      ? estimateTextLines(question.explanation)
      : 0;
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
    case "true-false":
    case "fill-in-blank":
      return explanation ? 2 + explanation : 1;
    case "short-answer":
      return (
        2 +
        estimateTextLines(question.referenceAnswer) +
        (question.scoringPoints?.length ?? 0) +
        explanation
      );
    case "essay":
      return 2 + estimateTextLines(question.scoringCriteria) + explanation;
    case "calculation":
      return (
        3 +
        estimateTextLines(question.answer) +
        estimateTextLines(question.solution) +
        explanation
      );
  }
}

function estimateTextLines(text: string | undefined): number {
  const lines = (text ?? "").split(/\r?\n/);
  return lines.reduce((sum, line) => {
    const trimmed = line.trim();
    if (!trimmed) return sum + 1;
    return sum + Math.max(1, Math.ceil(trimmed.length / 34));
  }, 0);
}

function fontLineHeightMm(settings: AppSettings): number {
  const fontSizePt = parseFloat(PAPER_FONT_SIZE_STYLES[settings.paperFontSize]);
  return fontSizePt * PT_TO_MM * PAPER_LINE_HEIGHT_STYLES[settings.paperLineHeight];
}

function parseMm(value: string): number {
  return Number.parseFloat(value.replace("mm", ""));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function blockHeight(block: PaperLayoutBlock, heights: BlockHeightMap): number {
  return Math.max(1, heights[block.id] ?? block.estimatedHeightMm);
}
