import { describe, expect, it } from "vitest";
import css from "../../styles/index.css?raw";

describe("index.css", () => {
  it("allows Markdown italic to synthesize visibly with paper fonts", () => {
    const markdownBodyRule = css.match(/\.markdown-body\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body ?? "";
    const markdownEmRule = css.match(/\.markdown-body em\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body ?? "";

    expect(markdownBodyRule).toMatch(/font-synthesis:\s*weight style;/);
    expect(markdownEmRule).toMatch(/font-style:\s*italic;/);
    expect(markdownEmRule).toMatch(/font-style:\s*oblique 12deg;/);
  });
});
