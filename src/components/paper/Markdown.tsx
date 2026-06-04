import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

interface MarkdownProps {
  children: string;
}

/**
 * Safe Markdown renderer for question content. Standard safe subset (no raw
 * HTML → XSS-safe by construction) + GFM tables + KaTeX math + code highlighting.
 * Memoized so editing one question doesn't re-render the whole paper.
 */
function MarkdownView({ children }: MarkdownProps) {
  return (
    <div className="prose prose-slate max-w-none prose-sm">
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
