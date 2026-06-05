import type { MarkdownFormat } from "./MarkdownFormatContext";

export interface MarkdownFormatResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function applyMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: MarkdownFormat,
): MarkdownFormatResult {
  const selected = value.slice(selectionStart, selectionEnd);

  if (format === "bulletList" || format === "orderedList" || format === "quote") {
    const blockStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
    const blockEndIndex = value.indexOf("\n", selectionEnd);
    const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
    const block = value.slice(blockStart, blockEnd);
    const lines = block.length > 0 ? block.split("\n") : [""];
    const formatted = lines
      .map((line, index) => {
        const stripped = line.replace(/^(\s*)([-*]\s+|\d+\.\s+|>\s*)/, "$1");
        if (format === "bulletList") return stripped.replace(/^(\s*)/, "$1- ");
        if (format === "orderedList") return stripped.replace(/^(\s*)/, `$1${index + 1}. `);
        return stripped.replace(/^(\s*)/, "$1> ");
      })
      .join("\n");
    return replaceRange(value, blockStart, blockEnd, formatted);
  }

  const fallback = format === "heading" ? "Heading" : "text";
  const text = selected || fallback;
  const wrappers: Record<
    Exclude<MarkdownFormat, "bulletList" | "orderedList" | "quote">,
    [string, string]
  > = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    underline: ["++", "++"],
    heading: ["## ", ""],
    code: ["`", "`"],
  };
  const [prefix, suffix] = wrappers[format];
  const replacement = `${prefix}${text}${suffix}`;
  const next = replaceRange(value, selectionStart, selectionEnd, replacement);
  return {
    value: next.value,
    selectionStart: selectionStart + prefix.length,
    selectionEnd: selectionStart + prefix.length + text.length,
  };
}

function replaceRange(
  value: string,
  start: number,
  end: number,
  replacement: string,
): MarkdownFormatResult {
  return {
    value: value.slice(0, start) + replacement + value.slice(end),
    selectionStart: start,
    selectionEnd: start + replacement.length,
  };
}
