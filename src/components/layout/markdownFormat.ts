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

  if (format === "clear") {
    return clearMarkdownFormat(value, selectionStart, selectionEnd);
  }

  if (
    format === "heading" ||
    format === "bulletList" ||
    format === "orderedList" ||
    format === "quote"
  ) {
    const blockStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
    const blockEndIndex = value.indexOf("\n", selectionEnd);
    const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
    const block = value.slice(blockStart, blockEnd);
    const lines = block.length > 0 ? block.split("\n") : [""];
    const everyLineFormatted = lines.every((line) => {
      if (format === "heading") return /^(\s*)#{1,6}\s+/.test(line);
      if (format === "bulletList") return /^(\s*)[-*]\s+/.test(line);
      if (format === "orderedList") return /^(\s*)\d+\.\s+/.test(line);
      return /^(\s*)>\s*/.test(line);
    });
    const formatted = lines
      .map((line, index) => {
        const stripped = line.replace(
          /^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/,
          "$1",
        );
        if (everyLineFormatted) return stripped;
        if (format === "heading") return stripped.replace(/^(\s*)/, "$1## ");
        if (format === "bulletList") return stripped.replace(/^(\s*)/, "$1- ");
        if (format === "orderedList") return stripped.replace(/^(\s*)/, `$1${index + 1}. `);
        return stripped.replace(/^(\s*)/, "$1> ");
      })
      .join("\n");
    return replaceRange(value, blockStart, blockEnd, formatted);
  }

  const fallback = "text";
  const text = selected || fallback;
  const wrappers: Record<
    Exclude<MarkdownFormat, "heading" | "bulletList" | "orderedList" | "quote" | "clear">,
    [string, string]
  > = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    underline: ["++", "++"],
    code: ["`", "`"],
  };
  const [prefix, suffix] = wrappers[format];
  const inlineRange = selected
    ? trimInlineSelection(value, selectionStart, selectionEnd)
    : { selectionStart, selectionEnd };
  const toggled = toggleWrappedRange(
    value,
    inlineRange.selectionStart,
    inlineRange.selectionEnd,
    prefix,
    suffix,
  );
  if (toggled) return toggled;

  const inlineText =
    value.slice(inlineRange.selectionStart, inlineRange.selectionEnd) || text;
  const replacement = `${prefix}${inlineText}${suffix}`;
  const next = replaceRange(
    value,
    inlineRange.selectionStart,
    inlineRange.selectionEnd,
    replacement,
  );
  return {
    value: next.value,
    selectionStart: inlineRange.selectionStart + prefix.length,
    selectionEnd: inlineRange.selectionStart + prefix.length + inlineText.length,
  };
}

function trimInlineSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { selectionStart: number; selectionEnd: number } {
  let start = selectionStart;
  let end = selectionEnd;
  while (start < end && /\s/.test(value[start])) start += 1;
  while (end > start && /\s/.test(value[end - 1])) end -= 1;
  return { selectionStart: start, selectionEnd: end };
}

function toggleWrappedRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
): MarkdownFormatResult | null {
  const selected = value.slice(selectionStart, selectionEnd);

  if (
    selected.startsWith(prefix) &&
    (suffix === "" || selected.endsWith(suffix))
  ) {
    const innerStart = selectionStart + prefix.length;
    const innerEnd = suffix
      ? selectionEnd - suffix.length
      : selectionEnd;
    return replaceRange(value, selectionStart, selectionEnd, value.slice(innerStart, innerEnd));
  }

  const suffixEnd = selectionEnd + suffix.length;
  if (
    hasStandaloneWrappingMarker(
      value,
      selectionStart,
      selectionEnd,
      prefix,
      suffix,
    )
  ) {
    const before = value.slice(0, selectionStart - prefix.length);
    const after = value.slice(suffixEnd);
    return {
      value: before + selected + after,
      selectionStart: selectionStart - prefix.length,
      selectionEnd: selectionEnd - prefix.length,
    };
  }

  return null;
}

function hasStandaloneWrappingMarker(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
): boolean {
  if (value.slice(selectionStart - prefix.length, selectionStart) !== prefix) {
    return false;
  }
  if (suffix !== "" && value.slice(selectionEnd, selectionEnd + suffix.length) !== suffix) {
    return false;
  }
  if (prefix === "*" && suffix === "*") {
    const beforePrefix = value[selectionStart - prefix.length - 1];
    const afterSuffix = value[selectionEnd + suffix.length];
    if (beforePrefix === "*" || afterSuffix === "*") return false;
  }
  return true;
}

function clearMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownFormatResult {
  const selected = value.slice(selectionStart, selectionEnd);
  const expanded = expandFormatSelection(value, selectionStart, selectionEnd);
  const target =
    expanded.selectionStart !== selectionStart || expanded.selectionEnd !== selectionEnd
      ? value.slice(expanded.selectionStart, expanded.selectionEnd)
      : selected;
  const cleaned = stripMarkdownMarkers(target);
  const result = replaceRange(
    value,
    expanded.selectionStart,
    expanded.selectionEnd,
    cleaned,
  );
  return {
    value: result.value,
    selectionStart: expanded.selectionStart,
    selectionEnd: expanded.selectionStart + cleaned.length,
  };
}

function expandFormatSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { selectionStart: number; selectionEnd: number } {
  const lineExpanded = expandLineFormatSelection(value, selectionStart, selectionEnd);
  if (lineExpanded) return lineExpanded;

  const pairs: Array<[string, string]> = [
    ["**", "**"],
    ["++", "++"],
    ["`", "`"],
    ["*", "*"],
  ];

  let start = selectionStart;
  let end = selectionEnd;
  let expanded = true;

  while (expanded) {
    expanded = false;
    for (const [prefix, suffix] of pairs) {
      if (
        value.slice(start - prefix.length, start) === prefix &&
        value.slice(end, end + suffix.length) === suffix
      ) {
        start -= prefix.length;
        end += suffix.length;
        expanded = true;
        break;
      }
    }
  }

  return { selectionStart: start, selectionEnd: end };
}

function expandLineFormatSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { selectionStart: number; selectionEnd: number } | null {
  const blockStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const blockEndIndex = value.indexOf("\n", selectionEnd);
  const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.length > 0 ? block.split("\n") : [""];
  const hasLineMarker = lines.some((line) =>
    /^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/.test(line),
  );

  return hasLineMarker
    ? { selectionStart: blockStart, selectionEnd: blockEnd }
    : null;
}

function stripMarkdownMarkers(value: string): string {
  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/, "$1")
        .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\+\+([^+]+)\+\+/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*([^*\n]+)\*/g, "$1"),
    )
    .join("\n");
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
