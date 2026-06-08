import { z } from "zod";
import type { WebSearchResult } from "../types/library";

const SearchWebInputSchema = z.object({
  query: z.string().trim().min(1),
});

export interface SearchWebToolCall {
  id: string;
  query: string;
}

export interface SearchWebContext {
  query: string;
  results: WebSearchResult[];
}

const SEARCH_WEB_FENCE_RE = /```search_web\s*([\s\S]*?)```/gi;
const SEARCH_WEB_ONLY_RE = /^(?:\s*```search_web\s*[\s\S]*?```\s*)+$/i;
const MAX_SEARCH_TOOL_CALLS = 3;

export function buildSearchToolInstructions(): string {
  return `Web search tool is available for this turn.

When current or source-backed information would improve the paper, request web search before answering. To request search, output one or more fenced blocks and no other prose:

\`\`\`search_web
{"query":"focused search keywords"}
\`\`\`

Rules:
- Use focused search keywords, not the whole user request.
- You may request up to ${MAX_SEARCH_TOOL_CALLS} searches in one response.
- After search results are provided, continue quickly with the normal two-phase paper workflow.
- Do not output chain-of-thought, long analysis, or planning notes.
- Do not invent citations or facts outside the provided search results.`;
}

export function parseSearchWebToolCalls(text: string): SearchWebToolCall[] {
  if (!isSearchWebToolOnlyResponse(text)) return [];

  const calls: SearchWebToolCall[] = [];
  const seenQueries = new Set<string>();

  for (const match of text.matchAll(SEARCH_WEB_FENCE_RE)) {
    if (calls.length >= MAX_SEARCH_TOOL_CALLS) break;
    const raw = match[1]?.trim();
    if (!raw) continue;

    const json = safeJsonParse(raw);
    const parsed = SearchWebInputSchema.safeParse(json);
    if (!parsed.success) continue;

    const normalizedQuery = parsed.data.query.replace(/\s+/g, " ").trim();
    const queryKey = normalizedQuery.toLocaleLowerCase();
    if (seenQueries.has(queryKey)) continue;
    seenQueries.add(queryKey);

    calls.push({
      id: `search_${calls.length + 1}`,
      query: normalizedQuery,
    });
  }

  return calls;
}

export function isSearchWebToolOnlyResponse(text: string): boolean {
  return SEARCH_WEB_ONLY_RE.test(text.trim());
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function formatSearchContext(contexts: SearchWebContext[]): string {
  let sourceNo = 0;
  return contexts
    .flatMap((context) =>
      context.results.map((result) => {
        sourceNo += 1;
        const parts = [
          `[${sourceNo}] ${result.title || result.url}`,
          `Search query: ${context.query}`,
          `URL: ${result.url}`,
        ];
        if (result.publishedAt) parts.push(`Published: ${result.publishedAt}`);
        if (result.snippet) parts.push(`Snippet: ${result.snippet}`);
        if (result.content) parts.push(`Content: ${result.content}`);
        return parts.join("\n");
      }),
    )
    .join("\n\n");
}

export function buildSearchContextMessage(contexts: SearchWebContext[]): string {
  return `Web search results for this turn. Use only these sources for web-backed claims, cite sources inline with bracket numbers like [1], and do not invent citations.

${formatSearchContext(contexts)}`;
}
