import { describe, expect, it } from "vitest";
import {
  markdownToPlainText,
  summarizeMarkdown,
} from "../exam/markdownPlainText";

describe("markdownToPlainText", () => {
  it("derives readable text from common Markdown constructs", () => {
    const text = markdownToPlainText(`
# **Kinematics** question

Use [Newton's law](https://example.test) and \`v = at\`.

![diagram](image.png)

$$s = \\frac{1}{2}at^2$$

- find acceleration
- explain *why*
`);

    expect(text).toContain("Kinematics question");
    expect(text).toContain("Newton's law");
    expect(text).toContain("v = at");
    expect(text).toContain("diagram");
    expect(text).toContain("s = \\frac 1 2 at^2");
    expect(text).toContain("find acceleration explain why");
    expect(text).not.toContain("**");
    expect(text).not.toContain("https://example.test");
  });

  it("truncates summaries and falls back for empty Markdown", () => {
    expect(summarizeMarkdown("**abcdef**", 4)).toBe("abcd...");
    expect(summarizeMarkdown("   ")).toBe("...");
  });
});
