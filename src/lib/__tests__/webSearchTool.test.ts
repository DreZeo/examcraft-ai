import { describe, expect, it } from "vitest";
import {
  buildSearchContextMessage,
  parseSearchWebToolCalls,
} from "../api/webSearchTool";
import type { WebSearchResult } from "../types/library";

function result(title: string, url: string): WebSearchResult {
  return {
    title,
    url,
    snippet: `Snippet for ${title}`,
    provider: "tavily",
  };
}

describe("web search tool protocol", () => {
  it("parses search_web fenced requests", () => {
    const calls = parseSearchWebToolCalls(`
\`\`\`search_web
{"query":"  computer grade 2 C language exam trend  "}
\`\`\`
`);

    expect(calls).toEqual([
      {
        id: "search_1",
        query: "computer grade 2 C language exam trend",
      },
    ]);
  });

  it("supports multiple search requests and ignores duplicates", () => {
    const calls = parseSearchWebToolCalls(`
\`\`\`search_web
{"query":"C language exam"}
\`\`\`
\`\`\`search_web
{"query":"c language exam"}
\`\`\`
\`\`\`search_web
{"query":"NCRE C programming"}
\`\`\`
`);

    expect(calls.map((call) => call.query)).toEqual([
      "C language exam",
      "NCRE C programming",
    ]);
  });

  it("ignores ordinary prose with embedded search_web examples", () => {
    const calls = parseSearchWebToolCalls(`
Here is how to call it:
\`\`\`search_web
{"query":"example"}
\`\`\`
`);

    expect(calls).toEqual([]);
  });

  it("formats all search contexts with stable source numbering", () => {
    const context = buildSearchContextMessage([
      { query: "first query", results: [result("A", "https://a.test")] },
      { query: "second query", results: [result("B", "https://b.test")] },
    ]);

    expect(context).toContain("[1] A");
    expect(context).toContain("Search query: first query");
    expect(context).toContain("[2] B");
    expect(context).toContain("Search query: second query");
  });
});
