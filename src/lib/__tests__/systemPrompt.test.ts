import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../api/systemPrompt";
import {
  AgentConfigSchema,
  AppSettingsSchema,
  type AgentConfig,
  type AppSettings,
} from "../types/config";
import { inferQuestionTypeStrategy } from "../exam/questionTypeStrategy";

function settings(patch: Partial<AppSettings> = {}): AppSettings {
  return AppSettingsSchema.parse({ ...patch });
}

function agent(patch: Partial<AgentConfig> = {}): AgentConfig {
  return AgentConfigSchema.parse({
    id: "agent-1",
    name: "Math Teacher",
    description: "Teaches math.",
    instructions: "Use step-by-step reasoning.",
    ...patch,
  });
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

  it("instructs the model to return paper operations", () => {
    const prompt = buildSystemPrompt(settings());
    expect(prompt).toContain('"operations"');
    expect(prompt).toContain("renamePaper");
    expect(prompt).toContain("appendQuestions");
    expect(prompt).toContain("updateQuestion");
    expect(prompt).toContain("deleteQuestion");
    expect(prompt).toContain("reorderQuestions");
  });

  it("asks for natural smart titles when generating papers", () => {
    const prompt = buildSystemPrompt(settings());
    expect(prompt).toContain("六年级英语试卷");
  });

  it("reflects the explanation tier — none", () => {
    const prompt = buildSystemPrompt(settings({ explanationTier: "none" }));
    expect(prompt).toMatch(/do not include an "explanation"/i);
  });

  it("reflects the explanation tier — detailed", () => {
    const prompt = buildSystemPrompt(settings({ explanationTier: "detailed" }));
    expect(prompt).toMatch(/detailed, step-by-step/i);
  });

  it("appends the active AI agent when present", () => {
    const prompt = buildSystemPrompt(settings(), undefined, agent());
    expect(prompt).toMatch(/active ai agent/i);
    expect(prompt).toContain("Math Teacher");
    expect(prompt).toContain("Use step-by-step reasoning.");
  });

  it("omits the agent section when no active agent is provided", () => {
    const prompt = buildSystemPrompt(settings(), undefined, null);
    expect(prompt).not.toMatch(/active ai agent/i);
  });

  it("omits the agent section when instructions are blank", () => {
    const prompt = buildSystemPrompt(
      settings(),
      undefined,
      agent({ instructions: "   " }),
    );
    expect(prompt).not.toMatch(/active ai agent/i);
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

  it("injects subject-aware question type strategy guidance", () => {
    const prompt = buildSystemPrompt(
      settings(),
      undefined,
      null,
      inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" }),
    );

    expect(prompt).toMatch(/question type strategy/i);
    expect(prompt).toContain("English language paper");
    expect(prompt).toContain("Default-excluded question types");
    expect(prompt).toContain("true-false");
    expect(prompt).toContain("fill-in-blank");
    expect(prompt).toContain("english-cloze");
    expect(prompt).toContain("english-reading");
    expect(prompt).toContain("examSection.passage");
    expect(prompt).toContain("完形填空");
    expect(prompt).toContain("阅读理解");
    expect(prompt).toContain("作文");
    expect(prompt).not.toContain("阅读理解判断");
  });
});
