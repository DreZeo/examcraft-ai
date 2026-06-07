export const TEXT_COLOR_PRESETS = [
  "auto",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
] as const;

export const HIGHLIGHT_COLOR_PRESETS = [
  "none",
  "yellow",
  "green",
  "cyan",
  "pink",
  "blue",
  "gray",
] as const;

export type TextColorPreset = (typeof TEXT_COLOR_PRESETS)[number];
export type HighlightColorPreset = (typeof HIGHLIGHT_COLOR_PRESETS)[number];

export const TEXT_COLOR_VALUES: Record<TextColorPreset, string | null> = {
  auto: null,
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#ca8a04",
  green: "#16a34a",
  blue: "#2563eb",
  purple: "#9333ea",
  gray: "#4b5563",
};

export const HIGHLIGHT_COLOR_VALUES: Record<HighlightColorPreset, string | null> = {
  none: null,
  yellow: "#fef08a",
  green: "#bbf7d0",
  cyan: "#a5f3fc",
  pink: "#fbcfe8",
  blue: "#bfdbfe",
  gray: "#e5e7eb",
};

export function isTextColorPreset(value: string): value is TextColorPreset {
  return TEXT_COLOR_PRESETS.includes(value as TextColorPreset);
}

export function isHighlightColorPreset(
  value: string,
): value is HighlightColorPreset {
  return HIGHLIGHT_COLOR_PRESETS.includes(value as HighlightColorPreset);
}

export function renderStyledMarkdownSyntax(
  text: string,
  render: (marker: ParsedStyleMarkerContent) => string,
): string {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const marker = readStyleMarker(text, index);
    if (!marker) {
      output += text[index];
      index += 1;
      continue;
    }
    const innerText = renderStyledMarkdownSyntax(marker.text, render);
    output +=
      marker.type === "textColor"
        ? render({ type: marker.type, color: marker.color, text: innerText })
        : render({ type: marker.type, color: marker.color, text: innerText });
    index = marker.end;
  }

  return output;
}

type ParsedStyleMarker =
  | { type: "textColor"; color: TextColorPreset; text: string; end: number }
  | { type: "highlight"; color: HighlightColorPreset; text: string; end: number };

type ParsedStyleMarkerContent =
  | { type: "textColor"; color: TextColorPreset; text: string }
  | { type: "highlight"; color: HighlightColorPreset; text: string };

function readStyleMarker(text: string, start: number): ParsedStyleMarker | null {
  const type = text.startsWith("{{color:", start)
    ? "textColor"
    : text.startsWith("{{mark:", start)
      ? "highlight"
      : null;
  if (!type) return null;
  const pipe = text.indexOf("|", start);
  if (pipe === -1) return null;
  const color = text.slice(start + (type === "textColor" ? 8 : 7), pipe);
  const isValid =
    type === "textColor"
      ? isTextColorPreset(color)
      : isHighlightColorPreset(color);
  if (!isValid) return null;

  const end = findStyleMarkerEnd(text, start);
  if (end === -1) return null;
  const innerText = text.slice(pipe + 1, end - 2);
  return type === "textColor"
    ? {
        type,
        color: color as TextColorPreset,
        text: innerText,
        end,
      }
    : {
        type,
        color: color as HighlightColorPreset,
        text: innerText,
        end,
      };
}

function findStyleMarkerEnd(text: string, start: number): number {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text.startsWith("{{color:", index) || text.startsWith("{{mark:", index)) {
      depth += 1;
      index += 1;
      continue;
    }
    if (text.startsWith("}}", index)) {
      depth -= 1;
      index += 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}
