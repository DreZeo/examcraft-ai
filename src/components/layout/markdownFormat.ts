import type { MarkdownFormat } from "./MarkdownFormatContext";
import {
  isHighlightColorPreset,
  isTextColorPreset,
} from "../../lib/exam/markdownStyle";

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
  const formatType = typeof format === "string" ? format : format.type;

  if (typeof format !== "string") {
    return applyInlineStyleFormat(value, selectionStart, selectionEnd, format);
  }

  if (formatType === "clear") {
    return clearMarkdownFormat(value, selectionStart, selectionEnd);
  }

  if (
    formatType === "heading" ||
    formatType === "bulletList" ||
    formatType === "orderedList" ||
    formatType === "quote"
  ) {
    const blockStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
    const blockEndIndex = value.indexOf("\n", selectionEnd);
    const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
    const block = value.slice(blockStart, blockEnd);
    const lines = block.length > 0 ? block.split("\n") : [""];
    const everyLineFormatted = lines.every((line) => {
      if (formatType === "heading") return /^(\s*)#{1,6}\s+/.test(line);
      if (formatType === "bulletList") return /^(\s*)[-*]\s+/.test(line);
      if (formatType === "orderedList") return /^(\s*)\d+\.\s+/.test(line);
      return /^(\s*)>\s*/.test(line);
    });
    const formatted = lines
      .map((line, index) => {
        const stripped = line.replace(
          /^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/,
          "$1",
        );
        if (everyLineFormatted) return stripped;
        if (formatType === "heading") return stripped.replace(/^(\s*)/, "$1## ");
        if (formatType === "bulletList") return stripped.replace(/^(\s*)/, "$1- ");
        if (formatType === "orderedList") return stripped.replace(/^(\s*)/, `$1${index + 1}. `);
        return stripped.replace(/^(\s*)/, "$1> ");
      })
      .join("\n");
    return replaceRange(value, blockStart, blockEnd, formatted);
  }

  if (
    formatType !== "bold" &&
    formatType !== "italic" &&
    formatType !== "underline" &&
    formatType !== "code"
  ) {
    return { value, selectionStart, selectionEnd };
  }

  const fallback = "text";
  const text = selected || fallback;
  const wrappers: Record<
    "bold" | "italic" | "underline" | "code",
    [string, string]
  > = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    underline: ["++", "++"],
    code: ["`", "`"],
  };
  const [prefix, suffix] = wrappers[formatType];
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

function applyInlineStyleFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: Exclude<MarkdownFormat, string>,
): MarkdownFormatResult {
  const inlineRange =
    selectionStart === selectionEnd
      ? { selectionStart, selectionEnd }
      : trimInlineSelection(value, selectionStart, selectionEnd);
  const selected = value.slice(inlineRange.selectionStart, inlineRange.selectionEnd);
  const fallback = "text";
  const inlineText = selected || fallback;
  const cleared = clearStyleAtRange(
    value,
    inlineRange.selectionStart,
    inlineRange.selectionEnd,
    format.type,
  );
  const adjustedStart = cleared.selectionStart;
  const adjustedEnd = cleared.selectionEnd;
  const text = value.slice(inlineRange.selectionStart, inlineRange.selectionEnd) || inlineText;
  const marker =
    format.type === "textColor"
      ? format.color === "auto"
        ? null
        : `{{color:${format.color}|${text}}}`
      : format.color === "none"
        ? null
        : `{{mark:${format.color}|${text}}}`;

  if (!marker) {
    return {
      value: cleared.value,
      selectionStart: adjustedStart,
      selectionEnd: adjustedEnd,
    };
  }

  const next = replaceRange(cleared.value, adjustedStart, adjustedEnd, marker);
  const contentOffset = marker.indexOf("|") + 1;
  return {
    value: next.value,
    selectionStart: adjustedStart + contentOffset,
    selectionEnd: adjustedStart + contentOffset + text.length,
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
  const styleExpanded = expandStyleFormatSelection(
    value,
    selectionStart,
    selectionEnd,
  );
  if (styleExpanded) return styleExpanded;

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

function expandStyleFormatSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { selectionStart: number; selectionEnd: number } | null {
  const wrappers = findStyleWrappers(value);
  const startWrapper = wrappers.find(
    (wrapper) =>
      selectionStart >= wrapper.contentStart &&
      selectionStart <= wrapper.contentEnd,
  );
  const endWrapper = wrappers.find(
    (wrapper) =>
      Math.max(selectionStart, selectionEnd - 1) >= wrapper.contentStart &&
      Math.max(selectionStart, selectionEnd - 1) <= wrapper.contentEnd,
  );
  if (!startWrapper && !endWrapper) return null;
  return {
    selectionStart: Math.min(
      startWrapper?.wrapperStart ?? selectionStart,
      endWrapper?.wrapperStart ?? selectionStart,
    ),
    selectionEnd: Math.max(
      startWrapper?.wrapperEnd ?? selectionEnd,
      endWrapper?.wrapperEnd ?? selectionEnd,
    ),
  };
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
        .replace(/\{\{color:([a-z]+)\|([^{}]+)\}\}/g, (_match, color: string, text: string) =>
          isTextColorPreset(color) ? text : _match,
        )
        .replace(/\{\{mark:([a-z]+)\|([^{}]+)\}\}/g, (_match, color: string, text: string) =>
          isHighlightColorPreset(color) ? text : _match,
        )
        .replace(/^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/, "$1")
        .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\+\+([^+]+)\+\+/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*([^*\n]+)\*/g, "$1"),
    )
    .join("\n");
}

function clearStyleAtRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  type: "textColor" | "highlight",
): MarkdownFormatResult {
  for (const wrapper of findStyleWrappers(value)) {
    if (wrapper.type !== type) continue;
    const selectionInside =
      selectionStart >= wrapper.contentStart && selectionEnd <= wrapper.contentEnd;
    const selectionCoversWrapper =
      selectionStart <= wrapper.wrapperStart && selectionEnd >= wrapper.wrapperEnd;
    if (!selectionInside && !selectionCoversWrapper) continue;

    const nextValue =
      value.slice(0, wrapper.wrapperStart) +
      wrapper.text +
      value.slice(wrapper.wrapperEnd);
    return {
      value: nextValue,
      selectionStart: wrapper.wrapperStart,
      selectionEnd: wrapper.wrapperStart + wrapper.text.length,
    };
  }

  return { value, selectionStart, selectionEnd };
}

interface StyleWrapper {
  type: "textColor" | "highlight";
  wrapperStart: number;
  wrapperEnd: number;
  contentStart: number;
  contentEnd: number;
  text: string;
}

function findStyleWrappers(value: string): StyleWrapper[] {
  const wrappers: StyleWrapper[] = [];
  let index = 0;

  while (index < value.length) {
    const marker =
      value.startsWith("{{color:", index)
        ? "color"
        : value.startsWith("{{mark:", index)
          ? "mark"
          : null;
    if (!marker) {
      index += 1;
      continue;
    }
    const pipe = value.indexOf("|", index);
    if (pipe === -1) {
      index += 1;
      continue;
    }
    const color = value.slice(index + marker.length + 3, pipe);
    const isValid =
      marker === "color"
        ? isTextColorPreset(color)
        : isHighlightColorPreset(color);
    const wrapperEnd = findStyleWrapperEnd(value, index);
    if (!isValid || wrapperEnd === -1) {
      index += 1;
      continue;
    }
    const wrapperStart = index;
    const contentStart = pipe + 1;
    wrappers.push({
      type: marker === "color" ? "textColor" : "highlight",
      wrapperStart,
      wrapperEnd,
      contentStart,
      contentEnd: wrapperEnd - 2,
      text: value.slice(contentStart, wrapperEnd - 2),
    });
    index += 1;
  }

  return wrappers;
}

function findStyleWrapperEnd(value: string, start: number): number {
  let depth = 0;
  for (let index = start; index < value.length; index += 1) {
    if (
      value.startsWith("{{color:", index) ||
      value.startsWith("{{mark:", index)
    ) {
      depth += 1;
      index += 1;
      continue;
    }
    if (value.startsWith("}}", index)) {
      depth -= 1;
      index += 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
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
