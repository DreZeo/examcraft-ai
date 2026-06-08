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
    expect(css).toContain("size: var(--paper-page-size);");
    expect(css).toContain("width: var(--paper-page-width) !important;");
    expect(css).toContain("min-height: var(--paper-page-height) !important;");
  });

  it("still hides UI chrome and prints each preview page separately", () => {
    expect(css).toMatch(/\.no-print\s*\{[\s\S]*display:\s*none !important;/);
    expect(css).toMatch(/\.paper-page\s*\{[\s\S]*break-after:\s*page;/);
    expect(css).toMatch(/\.paper-page:last-of-type\s*\{[\s\S]*break-after:\s*auto;/);
  });

  it("removes screen preview zoom before printing", () => {
    expect(css).toMatch(
      /\.paper-preview-zoom-stage\s*\{[\s\S]*width:\s*auto !important;[\s\S]*height:\s*auto !important;/,
    );
    expect(css).toMatch(
      /\.paper-page-stack\s*\{[\s\S]*transform:\s*none !important;/,
    );
  });

  it("does not let the browser re-paginate individual question blocks", () => {
    const questionBlockRule = css.match(/\.question-block\s*\{(?<body>[^}]*)\}/)
      ?.groups?.body ?? "";

    expect(questionBlockRule).not.toMatch(/break-inside:\s*avoid/);
    expect(questionBlockRule).not.toMatch(/page-break-inside:\s*avoid/);
  });
});
