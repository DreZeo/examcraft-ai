import { memo } from "react";
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
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownView);
