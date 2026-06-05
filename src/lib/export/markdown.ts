import type {
  ExamPaper,
  Question,
} from "../types/exam";
import { toStudentVersion } from "../exam/studentVersion";
import { totalScore } from "../exam/merge";
import { groupQuestionsByType } from "../exam/paperSections";
import {
  studentAnswerSpaceLines,
  studentBlankUnderlineLength,
} from "../exam/pagination";

/**
 * Pure paper -> Markdown assembly. Used by the Markdown file export and as the
 * text counterpart of the live paper preview. Questions are grouped by type
 * into numbered sections (一、二、三 …); each section restarts question numbering
 * at 1. Choice options render as A/B/C unless the stem already includes option
 * markers. Teacher output includes preview-like answer blocks; student output
 * strips answers, expands fill-in blanks, and adds answer-space placeholders for
 * subjective questions.
 */

export interface ExamInfoFieldFlags {
  subject: boolean;
  className: boolean;
  studentName: boolean;
  duration: boolean;
  totalScore: boolean;
}

export interface MarkdownExportOptions {
  includeAnswers: boolean;
  /** When provided, render an exam-info header block under the title. */
  header?: ExamInfoFieldFlags;
}

const BLANK = "__________";
const ANSWER_SPACE_LINE = "> ";

function buildHeader(paper: ExamPaper, flags: ExamInfoFieldFlags): string[] {
  const meta = paper.metadata ?? {};
  const parts: string[] = [];
  if (flags.subject) parts.push(`科目：${headerValue(meta.subject)}`);
  if (flags.className) parts.push(`班级：${headerValue(meta.className)}`);
  if (flags.studentName) parts.push(`姓名：${BLANK}`);
  if (flags.duration) {
    parts.push(`时长：${meta.duration != null ? `${meta.duration}` : BLANK}`);
  }
  if (flags.totalScore) {
    const total = meta.totalScore ?? totalScore(paper);
    parts.push(`总分：${total}`);
  }
  return parts.length ? [parts.join("　　"), "", "---", ""] : [];
}

function headerValue(value: string | undefined): string {
  return value?.trim() ? `${value}${BLANK}` : BLANK;
}

function renderOptions(options: string[]): string[] {
  return options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`);
}

function renderFillBlankContent(question: Question): string {
  if (question.type !== "fill-in-blank") return question.content;
  const blankLength = studentBlankUnderlineLength(question);
  const replacement = "_".repeat(blankLength);
  return /_{3,}/.test(question.content)
    ? question.content.replace(/_{3,}/g, replacement)
    : `${question.content} ${Array.from(
        { length: question.blanks.length },
        () => replacement,
      ).join(" ")}`;
}

/** Preview-aligned answer + explanation lines for teacher output only. */
function renderAnswer(q: Question): string[] {
  const lines: string[] = [];

  for (const section of getAnswerSections(q)) {
    if (!section.content?.trim()) continue;
    lines.push(`> **【${section.label}】**`);
    lines.push(...blockquoteContent(section.content));
  }

  if ("explanation" in q && q.explanation?.trim()) {
    lines.push(`> **【解析】**`);
    lines.push(...blockquoteContent(q.explanation));
  }

  return lines;
}

function renderQuestion(
  q: Question,
  number: number,
  includeAnswers: boolean,
): string[] {
  const content =
    !includeAnswers && q.type === "fill-in-blank"
      ? renderFillBlankContent(q)
      : q.content;
  const lines: string[] = [`${number}. ${content} (${q.score})`];
  if ("options" in q && !contentIncludesOptions(q.content, q.options)) {
    lines.push("", ...renderOptions(q.options));
  }
  if (includeAnswers) {
    const answer = renderAnswer(q);
    if (answer.length) lines.push("", ...answer);
  } else {
    const answerSpace = renderStudentAnswerSpace(q);
    if (answerSpace.length) lines.push("", ...answerSpace);
  }
  lines.push("");
  return lines;
}

function renderStudentAnswerSpace(question: Question): string[] {
  const lines = studentAnswerSpaceLines(question);
  if (lines === 0) return [];
  return Array.from({ length: lines }, () => ANSWER_SPACE_LINE);
}

function contentIncludesOptions(content: string, options: string[]): boolean {
  if (options.length === 0) return false;
  const optionMarkers = content.match(/(?:^|\s)[A-J][.)、]\s*/g) ?? [];
  if (optionMarkers.length >= options.length) return true;

  const lines = content
    .split(/\r?\n/)
    .map((line) => normalizeOptionText(line.replace(/^\s*[A-J][.)、]\s*/, "")))
    .filter(Boolean);
  return options.every((option) =>
    lines.includes(normalizeOptionText(option)),
  );
}

function normalizeOptionText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function blockquoteContent(content: string): string[] {
  const lines = content.split(/\r?\n/);
  return lines.map((line) => (line.trim() ? `> ${line}` : ">"));
}

interface AnswerSection {
  label: string;
  content?: string;
}

function getAnswerSections(question: Question): AnswerSection[] {
  switch (question.type) {
    case "single-choice":
      return [
        {
          label: "答案",
          content: String.fromCharCode(65 + question.correctAnswer),
        },
      ];
    case "multiple-choice":
      return [
        {
          label: "答案",
          content: question.correctAnswers
            .map((i) => String.fromCharCode(65 + i))
            .join(", "),
        },
      ];
    case "true-false":
      return [{ label: "答案", content: question.correctAnswer ? "正确" : "错误" }];
    case "fill-in-blank":
      return [{ label: "答案", content: question.blanks.join(" / ") }];
    case "short-answer": {
      const sections: AnswerSection[] = [
        { label: "答案", content: question.referenceAnswer },
      ];
      if (question.scoringPoints?.length) {
        sections.push({
          label: "评分要点",
          content: question.scoringPoints.map((point) => `- ${point}`).join("\n"),
        });
      }
      return sections;
    }
    case "essay":
      return [{ label: "答案", content: question.scoringCriteria }];
    case "calculation":
      return [
        { label: "答案", content: question.answer },
        { label: "解题步骤", content: question.solution },
      ];
  }
}

export function paperToMarkdown(
  paper: ExamPaper,
  options: MarkdownExportOptions,
): string {
  const { includeAnswers } = options;
  const source = includeAnswers ? paper : toStudentVersion(paper);

  const lines: string[] = [`# ${source.title || "未命名试卷"}`, ""];
  if (options.header) lines.push(...buildHeader(source, options.header));

  for (const section of groupQuestionsByType(source)) {
    lines.push(`## ${section.title}`, "");
    section.questions.forEach((q, i) => {
      lines.push(...renderQuestion(q, i + 1, includeAnswers));
    });
  }

  return lines.join("\n").trimEnd() + "\n";
}
