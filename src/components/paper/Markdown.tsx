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
    if (typeof child === "string") return renderUnderlineText(child);
    if (isValidElement(child)) {
      const element = child as ReactElement<{ children?: ReactNode }>;
      return cloneElement(element, {
        children: renderUnderlineSyntax(element.props.children),
      });
    }
    return child;
  });
}

function renderUnderlineText(text: string): ReactNode {
  const parts = text.split(/(\+\+[^\s+\n](?:[\s\S]*?[^\s+\n])?\+\+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, index) => {
    if (part.startsWith("++") && part.endsWith("++")) {
      return <u key={index}>{part.slice(2, -2)}</u>;
    }
    return part;
  });
}
