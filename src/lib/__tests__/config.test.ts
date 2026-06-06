import { describe, expect, it } from "vitest";
import {
  AppConfigSchema,
  DEFAULT_AGENTS,
  GLOBAL_FONT_OPTIONS,
  GLOBAL_FONT_STACKS,
} from "../types/config";

describe("AppConfigSchema", () => {
  it("defaults paper font for fresh config", () => {
    const config = AppConfigSchema.parse({});
    expect(config.settings.paperFont).toBe("default");
    expect(config.settings.paperFontSize).toBe("xiaosi");
    expect(config.settings.paperLineHeight).toBe("standard");
    expect(config.settings.paperMargin).toBe("standard");
    expect(config.settings.paperSize).toBe("a4");
  });

  it("loads old settings without paper layout presets", () => {
    const config = AppConfigSchema.parse({
      settings: {
        language: "en",
        theme: "dark",
        autoSave: false,
        explanationTier: "detailed",
      },
    });

    expect(config.settings.paperFont).toBe("default");
    expect(config.settings.paperFontSize).toBe("xiaosi");
    expect(config.settings.paperLineHeight).toBe("standard");
    expect(config.settings.paperMargin).toBe("standard");
    expect(config.settings.paperSize).toBe("a4");
    expect(config.settings.language).toBe("en");
  });

  it("accepts every global font preset and has a stack for each one", () => {
    expect(GLOBAL_FONT_OPTIONS).toEqual([
      "system",
      "sans",
      "sourcehan",
      "simsun",
      "simhei",
      "dengxian",
      "times",
      "mono",
    ]);

    for (const globalFont of GLOBAL_FONT_OPTIONS) {
      const config = AppConfigSchema.parse({ settings: { globalFont } });
      expect(config.settings.globalFont).toBe(globalFont);
      expect(GLOBAL_FONT_STACKS).toHaveProperty(globalFont);
    }
  });

  it("maps removed global font presets to effective visible presets", () => {
    expect(
      AppConfigSchema.parse({ settings: { globalFont: "serif" } }).settings
        .globalFont,
    ).toBe("simsun");
    for (const legacy of ["yahei", "pingfang", "inter", "arial"]) {
      expect(
        AppConfigSchema.parse({ settings: { globalFont: legacy } }).settings
          .globalFont,
      ).toBe("sans");
    }
  });

  it("keeps configured paper layout presets", () => {
    const config = AppConfigSchema.parse({
      settings: {
        paperFont: "fangsong",
        paperFontSize: "sanhao",
        paperLineHeight: "relaxed",
        paperMargin: "wide",
        paperSize: "b5",
      },
    });

    expect(config.settings.paperFont).toBe("fangsong");
    expect(config.settings.paperFontSize).toBe("sanhao");
    expect(config.settings.paperLineHeight).toBe("relaxed");
    expect(config.settings.paperMargin).toBe("wide");
    expect(config.settings.paperSize).toBe("b5");
  });

  it("maps old paper font size presets and ignores old text alignment", () => {
    const config = AppConfigSchema.parse({
      settings: {
        paperFontSize: "large",
        paperTextAlign: "justify",
      },
    });

    expect(config.settings.paperFontSize).toBe("sihao");
    expect(config.settings.paperSize).toBe("a4");
    expect("paperTextAlign" in config.settings).toBe(false);
  });

  it("maps old paper font presets to practical Chinese fonts", () => {
    expect(
      AppConfigSchema.parse({ settings: { paperFont: "serif" } }).settings.paperFont,
    ).toBe("simsun");
    expect(
      AppConfigSchema.parse({ settings: { paperFont: "sans" } }).settings.paperFont,
    ).toBe("yahei");
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
