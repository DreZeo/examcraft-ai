import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  HIGHLIGHT_COLOR_VALUES,
  TEXT_COLOR_VALUES,
  isHighlightColorPreset,
  isTextColorPreset,
} from "../../lib/exam/markdownStyle";

interface MarkdownProps {
  children: string;
  variant?: "default" | "compact";
}

/**
 * Safe Markdown renderer for question content. Standard safe subset (no raw
 * HTML → XSS-safe by construction) + GFM tables + KaTeX math + code highlighting.
 * Memoized so editing one question doesn't re-render the whole paper.
 */
function MarkdownView({ children, variant = "default" }: MarkdownProps) {
  return (
    <div
      className={
        variant === "compact"
          ? "markdown-body markdown-body-compact"
          : "markdown-body"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} rel="noopener noreferrer" target="_blank" />
          ),
          p: ({ node: _node, children, ...props }) => (
            <p {...props}>{renderUnderlineSyntax(children)}</p>
          ),
          li: ({ node: _node, children, ...props }) => (
            <li {...props}>{renderUnderlineSyntax(children)}</li>
          ),
          td: ({ node: _node, children, ...props }) => (
            <td {...props}>{renderUnderlineSyntax(children)}</td>
          ),
          th: ({ node: _node, children, ...props }) => (
            <th {...props}>{renderUnderlineSyntax(children)}</th>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownView);

function renderUnderlineSyntax(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return renderInlineSyntaxText(child);
    if (isValidElement(child)) {
      const element = child as ReactElement<{ children?: ReactNode }>;
      return cloneElement(element, {
        children: renderUnderlineSyntax(element.props.children),
      });
    }
    return child;
  });
}

function renderInlineSyntaxText(text: string): ReactNode {
  const parts = splitInlineSyntax(text);
  if (parts.length === 1 && parts[0].type === "text") return text;
  return parts.map((part, index) => {
    if (part.type === "text") return part.value;
    const marker = part.value;
    if (marker.startsWith("++") && marker.endsWith("++")) {
      return <u key={index}>{marker.slice(2, -2)}</u>;
    }
    const color = marker.match(/^\{\{color:([a-z]+)\|([\s\S]+)\}\}$/);
    if (color && isTextColorPreset(color[1])) {
      const colorValue = TEXT_COLOR_VALUES[color[1]];
      return colorValue ? (
        <span key={index} style={{ color: colorValue }}>
          {renderInlineSyntaxText(color[2])}
        </span>
      ) : color[2];
    }
    const mark = marker.match(/^\{\{mark:([a-z]+)\|([\s\S]+)\}\}$/);
    if (mark && isHighlightColorPreset(mark[1])) {
      const colorValue = HIGHLIGHT_COLOR_VALUES[mark[1]];
      return colorValue ? (
        <mark key={index} style={{ backgroundColor: colorValue, color: "inherit" }}>
          {renderInlineSyntaxText(mark[2])}
        </mark>
      ) : mark[2];
    }
    return marker;
  });
}

type InlineSyntaxPart =
  | { type: "text"; value: string }
  | { type: "syntax"; value: string };

function splitInlineSyntax(text: string): InlineSyntaxPart[] {
  const parts: InlineSyntaxPart[] = [];
  let index = 0;

  while (index < text.length) {
    const rest = text.slice(index);
    const underline = rest.match(/^\+\+[^\s+\n](?:[\s\S]*?[^\s+\n])?\+\+/);
    const style = findStyleMarker(text, index);
    const match = underline?.[0] ?? style;
    if (!match) {
      const next = findNextSyntaxStart(text, index + 1);
      const end = next === -1 ? text.length : next;
      parts.push({ type: "text", value: text.slice(index, end) });
      index = end;
      continue;
    }
    parts.push({ type: "syntax", value: match });
    index += match.length;
  }

  return parts;
}

function findNextSyntaxStart(text: string, from: number): number {
  const candidates = [
    text.indexOf("++", from),
    text.indexOf("{{color:", from),
    text.indexOf("{{mark:", from),
  ].filter((value) => value >= 0);
  return candidates.length ? Math.min(...candidates) : -1;
}

function findStyleMarker(text: string, start: number): string | null {
  if (!text.startsWith("{{color:", start) && !text.startsWith("{{mark:", start)) {
    return null;
  }
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
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}
