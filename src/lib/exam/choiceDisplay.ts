import type { Question } from "../types/exam";

export interface ChoiceDisplay {
  stem: string;
  options: string[];
}

type ChoiceQuestion = Extract<
  Question,
  { type: "single-choice" | "multiple-choice" }
>;

interface ParsedOption {
  label: string;
  text: string;
  markerStart: number;
}

const OPTION_MARKER = /(?:^|\s)([A-J])[\.)、]\s*/g;

/**
 * Normalize choice questions for display/export. The AI sometimes puts options
 * inside `content` even when the structured `options` field exists. Renderers
 * should show the clean stem once and lay out options from this helper.
 */
export function choiceDisplay(question: ChoiceQuestion): ChoiceDisplay {
  const parsed = parseEmbeddedOptions(question.content);
  const structured = Array.isArray(question.options) ? question.options : [];
  const options = structured.length > 0 ? structured : parsed.map((opt) => opt.text);
  const stem =
    parsed.length >= Math.max(2, options.length)
      ? question.content.slice(0, parsed[0].markerStart).trim()
      : question.content.trim();

  return {
    stem: stripLeadingQuestionNumber(stem),
    options,
  };
}

export function stripLeadingQuestionNumber(content: string): string {
  return content.replace(/^\s*\d+[.)、]\s*/, "").trimStart();
}

function parseEmbeddedOptions(content: string): ParsedOption[] {
  const matches = [...content.matchAll(OPTION_MARKER)];
  if (matches.length < 2) return [];

  return matches
    .map((match, index) => {
      const markerStart = match.index ?? 0;
      const textStart = markerStart + match[0].length;
      const nextStart = matches[index + 1]?.index ?? content.length;
      return {
        label: match[1],
        markerStart,
        text: content.slice(textStart, nextStart).trim(),
      };
    })
    .filter((option) => option.text.length > 0);
}
