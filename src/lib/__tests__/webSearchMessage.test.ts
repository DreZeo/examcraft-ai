import { describe, expect, it } from "vitest";
import { ChatMessageSchema } from "../types/library";

describe("web search chat messages", () => {
  it("parses persisted source summary messages", () => {
    const message = ChatMessageSchema.parse({
      id: "search-1",
      kind: "webSearch",
      provider: "tavily",
      query: "latest AI exam design",
      contentMode: "summary",
      results: [
        {
          title: "Result",
          url: "https://example.com",
          snippet: "A useful source.",
          provider: "tavily",
        },
      ],
    });

    expect(message.kind).toBe("webSearch");
    if (message.kind !== "webSearch") throw new Error("expected webSearch message");
    expect(message.results[0]?.url).toBe("https://example.com");
  });
});
