import { describe, expect, it } from "vitest";
import { AppConfigSchema, DEFAULT_AGENTS } from "../types/config";

describe("AppConfigSchema", () => {
  it("defaults paper font for fresh config", () => {
    const config = AppConfigSchema.parse({});
    expect(config.settings.paperFont).toBe("default");
  });

  it("loads old settings without paper font", () => {
    const config = AppConfigSchema.parse({
      settings: {
        language: "en",
        theme: "dark",
        autoSave: false,
        explanationTier: "detailed",
      },
    });

    expect(config.settings.paperFont).toBe("default");
    expect(config.settings.language).toBe("en");
  });

  it("keeps a configured paper font preset", () => {
    const config = AppConfigSchema.parse({
      settings: { paperFont: "serif" },
    });

    expect(config.settings.paperFont).toBe("serif");
  });

  it("adds default AI agents when config has none", () => {
    const config = AppConfigSchema.parse({});
    expect(config.agents.map((agent) => agent.id)).toEqual(
      DEFAULT_AGENTS.map((agent) => agent.id),
    );
    expect(config.activeAgentId).toBeNull();
  });

  it("keeps a valid active agent id", () => {
    const config = AppConfigSchema.parse({
      agents: [
        {
          id: "custom-agent",
          name: "Physics Teacher",
          description: "",
          instructions: "Prefer experiments.",
        },
      ],
      activeAgentId: "custom-agent",
    });
    expect(config.activeAgentId).toBe("custom-agent");
  });

  it("does not restore deleted built-in agents", () => {
    const config = AppConfigSchema.parse({
      deletedBuiltInAgentIds: ["builtin-math-teacher"],
    });
    expect(config.agents.map((agent) => agent.id)).not.toContain(
      "builtin-math-teacher",
    );
  });

  it("clears an invalid active agent id", () => {
    const config = AppConfigSchema.parse({ activeAgentId: "missing-agent" });
    expect(config.activeAgentId).toBeNull();
  });

  it("migrates legacy custom instructions into a custom agent", () => {
    const config = AppConfigSchema.parse({
      settings: { customInstructions: "Always use metric units." },
    });
    const migrated = config.agents.find(
      (agent) => agent.id === "legacy-custom-instructions",
    );
    expect(migrated?.instructions).toBe("Always use metric units.");
    expect(config.activeAgentId).toBe("legacy-custom-instructions");
  });
});
