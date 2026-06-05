import type {
  ExamPaper,
  Question,
} from "../types/exam";
import { toStudentVersion } from "../exam/studentVersion";
import { totalScore } from "../exam/merge";
import { formatAnswer } from "../exam/answer";
import { groupQuestionsByType } from "../exam/paperSections";

/**
 * Pure paper -> Markdown assembly. Used by the Markdown file export and as the
 * source of truth for what the document contains. Questions are grouped by type
 * into numbered sections (一、二、三 …); each section restarts question numbering
 * at 1. Choice options render as A/B/C. Answers and explanations render only
 * when `includeAnswers` is true; the student variant additionally strips answer
 * fields via `toStudentVersion` (so e.g. fill-in blanks are emptied).
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

function buildHeader(paper: ExamPaper, flags: ExamInfoFieldFlags): string[] {
  const meta = paper.metadata ?? {};
  const parts: string[] = [];
  if (flags.subject) parts.push(`科目：${meta.subject ?? BLANK}`);
  if (flags.className) parts.push(`班级：${meta.className ?? BLANK}`);
  if (flags.studentName) parts.push(`姓名：${BLANK}`);
  if (flags.duration) {
    parts.push(`时长：${meta.duration != null ? `${meta.duration} 分钟` : BLANK}`);
  }
  if (flags.totalScore) {
    const total = meta.totalScore ?? totalScore(paper);
    parts.push(`总分：${total} 分`);
  }
  return parts.length ? [parts.join("　　"), ""] : [];
}

function renderOptions(options: string[]): string[] {
  return options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`);
}

/** Answer + explanation lines for a single question (teacher output only). */
function renderAnswer(q: Question): string[] {
  const lines: string[] = [];
  const answer = formatAnswer(q);
  if (answer) lines.push(`**【答案】** ${answer}`);
  if (q.type === "calculation" && q.solution) {
    lines.push(`**【解题】** ${q.solution}`);
  }
  if (q.type === "short-answer" && q.scoringPoints?.length) {
    lines.push(`**【评分点】** ${q.scoringPoints.join("；")}`);
  }
  if ("explanation" in q && q.explanation) {
    lines.push(`**【解析】** ${q.explanation}`);
  }
  return lines;
}

function renderQuestion(
  q: Question,
  number: number,
  includeAnswers: boolean,
): string[] {
  const lines: string[] = [`${number}. ${q.content}（${q.score} 分）`];
  if ("options" in q) {
    lines.push("", ...renderOptions(q.options));
  }
  if (includeAnswers) {
    const answer = renderAnswer(q);
    if (answer.length) lines.push("", ...answer);
  }
  lines.push("");
  return lines;
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
    lines.push(`## ${section.title}（共 ${section.score} 分）`, "");
    section.questions.forEach((q, i) => {
      lines.push(...renderQuestion(q, i + 1, includeAnswers));
    });
  }

  return lines.join("\n").trimEnd() + "\n";
}
