import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../api/systemPrompt";
import { AppSettingsSchema, type AppSettings } from "../types/config";

function settings(patch: Partial<AppSettings> = {}): AppSettings {
  return AppSettingsSchema.parse({ ...patch });
}

describe("buildSystemPrompt", () => {
  it("describes the two-phase flow and fenced JSON output", () => {
    const prompt = buildSystemPrompt(settings());
    expect(prompt).toMatch(/two phases/i);
    expect(prompt).toMatch(/```json/);
    expect(prompt).toMatch(/subject-neutral/i);
  });

  it("lists all 7 question types from the schema", () => {
    const prompt = buildSystemPrompt(settings());
    for (const type of [
      "single-choice",
      "multiple-choice",
      "true-false",
      "fill-in-blank",
      "short-answer",
      "essay",
      "calculation",
    ]) {
      expect(prompt).toContain(type);
    }
  });

  it("states that answers are mandatory", () => {
    expect(buildSystemPrompt(settings())).toMatch(/mandatory/i);
  });

  it("reflects the explanation tier — none", () => {
    const prompt = buildSystemPrompt(settings({ explanationTier: "none" }));
    expect(prompt).toMatch(/do not include an "explanation"/i);
  });

  it("reflects the explanation tier — detailed", () => {
    const prompt = buildSystemPrompt(settings({ explanationTier: "detailed" }));
    expect(prompt).toMatch(/detailed, step-by-step/i);
  });

  it("appends custom instructions when present", () => {
    const prompt = buildSystemPrompt(
      settings({ customInstructions: "Always use metric units." }),
    );
    expect(prompt).toContain("Always use metric units.");
    expect(prompt).toMatch(/additional user instructions/i);
  });

  it("omits the custom section when instructions are blank", () => {
    const prompt = buildSystemPrompt(settings({ customInstructions: "   " }));
    expect(prompt).not.toMatch(/additional user instructions/i);
  });

  it("includes the paper summary when provided", () => {
    const prompt = buildSystemPrompt(
      settings(),
      "Questions: 2, total 15 pts",
    );
    expect(prompt).toMatch(/current paper/i);
    expect(prompt).toContain("Questions: 2, total 15 pts");
  });

  it("omits the paper section when no summary is given", () => {
    expect(buildSystemPrompt(settings())).not.toMatch(/# current paper/i);
  });
});
