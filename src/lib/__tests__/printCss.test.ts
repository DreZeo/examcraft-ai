import { describe, expect, it } from "vitest";
import css from "../../styles/print.css?raw";

describe("print.css", () => {
  it("keeps live paper page dimensions and padding for WYSIWYG printing", () => {
    const paperSheetRule = css.match(/\.paper-sheet\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body ?? "";

    expect(paperSheetRule).not.toMatch(/width:\s*100%/);
    expect(paperSheetRule).not.toMatch(/max-width:\s*none/);
    expect(paperSheetRule).not.toMatch(/padding:\s*0/);
    expect(css).toContain("@page");
    expect(css).toContain("margin: 0;");
  });

  it("still hides UI chrome and prints each preview page separately", () => {
    expect(css).toMatch(/\.no-print\s*\{[\s\S]*display:\s*none !important;/);
    expect(css).toMatch(/\.paper-page\s*\{[\s\S]*break-after:\s*page;/);
    expect(css).toMatch(/\.paper-page:last-of-type\s*\{[\s\S]*break-after:\s*auto;/);
  });
});
