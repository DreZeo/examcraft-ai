/**
 * Convert a Markdown-ish string into compact readable plain text for UI
 * summaries. It intentionally does not parse or render HTML; visible paper
 * content should use the safe Markdown component instead.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/```[\s\S]*?```/g, (block) =>
      block
        .replace(/^```[^\n]*\n?/, "")
        .replace(/```$/, "")
        .trim(),
    )
    .replace(/~~~[\s\S]*?~~~/g, (block) =>
      block
        .replace(/^~~~[^\n]*\n?/, "")
        .replace(/~~~$/, "")
        .trim(),
    )
    .replace(/!\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, " ")
    .replace(/[*_~]/g, "")
    .replace(/\|/g, " ")
    .replace(/[<>[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeMarkdown(markdown: string, maxLength = 44): string {
  const text = markdownToPlainText(markdown);
  if (!text) return "...";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
