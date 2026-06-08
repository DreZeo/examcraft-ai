import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildPaperContextMessage,
  languageName,
} from "../api/systemPrompt";
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

  it("uses the interface language as the default response language", () => {
    expect(buildSystemPrompt(settings({ language: "zh" }))).toContain(
      "Use Simplified Chinese for all user-visible natural language",
    );
    expect(buildSystemPrompt(settings({ language: "en" }))).toContain(
      "Use English for all user-visible natural language",
    );
    expect(languageName("zh")).toBe("Simplified Chinese");
    expect(languageName("en")).toBe("English");
  });

  it("allows a per-turn target language override", () => {
    const prompt = buildSystemPrompt(settings({ language: "en" }), null, "Simplified Chinese");
    expect(prompt).toContain(
      "Use Simplified Chinese for all user-visible natural language",
    );
    expect(prompt).toContain(
      "if the user asks in Chinese for an English exam paper",
    );
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
    const prompt = buildSystemPrompt(settings(), agent());
    expect(prompt).toMatch(/active ai agent/i);
    expect(prompt).toContain("Math Teacher");
    expect(prompt).toContain("Use step-by-step reasoning.");
  });

  it("omits the agent section when no active agent is provided", () => {
    const prompt = buildSystemPrompt(settings(), null);
    expect(prompt).not.toMatch(/active ai agent/i);
  });

  it("omits the agent section when instructions are blank", () => {
    const prompt = buildSystemPrompt(
      settings(),
      agent({ instructions: "   " }),
    );
    expect(prompt).not.toMatch(/active ai agent/i);
  });

  it("does not include paper summary in the system prompt", () => {
    expect(buildSystemPrompt(settings())).not.toMatch(/# current paper/i);
  });

  it("does not include question type strategy in the system prompt", () => {
    const strategy = inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" });
    const prompt = buildSystemPrompt(settings(), null);
    expect(prompt).not.toMatch(/question type strategy/i);
    // strategy is not used in buildSystemPrompt — suppress unused variable warning
    void strategy;
  });
});

describe("buildPaperContextMessage", () => {
  it("returns null when no summary and no strategy", () => {
    expect(buildPaperContextMessage()).toBeNull();
    expect(buildPaperContextMessage("", null)).toBeNull();
    expect(buildPaperContextMessage("   ", null)).toBeNull();
  });

  it("includes paper summary when provided", () => {
    const msg = buildPaperContextMessage("Questions: 2, total 15 pts");
    expect(msg).not.toBeNull();
    expect(msg).toContain("[Paper context for this turn]");
    expect(msg).toMatch(/# Current paper/i);
    expect(msg).toContain("Questions: 2, total 15 pts");
  });

  it("includes strategy section when provided", () => {
    const strategy = inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" });
    const msg = buildPaperContextMessage(undefined, strategy);
    expect(msg).not.toBeNull();
    expect(msg).toContain("[Paper context for this turn]");
    expect(msg).toMatch(/internal question-type policy/i);
    expect(msg).toContain("Policy scope: subject-specific question type constraints");
    expect(msg).not.toContain("Policy id: english-language");
    expect(msg).not.toContain("Detected context: English language paper");
  });

  it("includes both summary and strategy when both are provided", () => {
    const strategy = inferQuestionTypeStrategy({ requestText: "生成一份六年级英语试卷" });
    const msg = buildPaperContextMessage("Questions: 3, total 20 pts", strategy);
    expect(msg).not.toBeNull();
    expect(msg).toContain("[Paper context for this turn]");
    expect(msg).toMatch(/internal question-type policy/i);
    expect(msg).toMatch(/# Current paper/i);
    expect(msg).toContain("Questions: 3, total 20 pts");
  });
});
