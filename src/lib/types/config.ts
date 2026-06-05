import { z } from "zod";

/**
 * App configuration model. Persisted to `config.json` in the user-chosen data
 * directory. API keys are NOT stored here — they live in the OS keychain,
 * keyed by the config `id`. config.json holds only non-sensitive fields.
 */

export const CONFIG_SCHEMA_VERSION = 1;

/** A single OpenAI-compatible model configuration. */
export const ModelConfigSchema = z.object({
  /** Stable id; also the keychain account key for this config's API key. */
  id: z.string().min(1),
  /** User-facing display name, e.g. "OpenAI Main", "DeepSeek". */
  name: z.string().min(1),
  /** Base URL, e.g. "https://api.openai.com/v1". */
  baseUrl: z.string().min(1),
  /** Model name, e.g. "gpt-4o". */
  model: z.string().min(1),
  /** Optional advanced params (collapsed in UI, sensible defaults). */
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

/** Detail level for AI-generated explanations. */
export const ExplanationTierSchema = z.enum(["none", "brief", "detailed"]);

/** Color theme preference. `system` follows the OS prefers-color-scheme. */
export const ThemeSchema = z.enum(["system", "light", "dark"]);

/** UI global font preset. Overrides --font-sans CSS variable on <html>. */
export const GlobalFontSchema = z.enum(["system", "sans", "serif", "mono"]);
export type GlobalFont = z.infer<typeof GlobalFontSchema>;
export const GLOBAL_FONT_OPTIONS = GlobalFontSchema.options;
export const GLOBAL_FONT_STACKS: Record<GlobalFont, string> = {
  system: "",
  sans: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", system-ui, sans-serif',
  serif: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

/** Paper rendering font preset. Uses system font stacks, not bundled font files. */
export const PaperFontSchema = z.enum([
  "default",
  "simsun",
  "simhei",
  "kaiti",
  "fangsong",
  "yahei",
  "dengxian",
  "times",
  "mono",
]);
export const PaperFontSizeSchema = z.enum(["wuhao", "xiaosi", "sihao", "sanhao"]);
export const PaperLineHeightSchema = z.enum(["compact", "standard", "relaxed"]);
export const PaperMarginSchema = z.enum(["narrow", "standard", "wide"]);
export const PaperSizeSchema = z.enum(["a4", "a3", "b5", "letter"]);

export type PaperFont = z.infer<typeof PaperFontSchema>;
export type PaperFontSize = z.infer<typeof PaperFontSizeSchema>;
export type PaperLineHeight = z.infer<typeof PaperLineHeightSchema>;
export type PaperMargin = z.infer<typeof PaperMarginSchema>;
export type PaperSize = z.infer<typeof PaperSizeSchema>;

export const PAPER_FONT_OPTIONS = PaperFontSchema.options;
export const PAPER_FONT_SIZE_OPTIONS = PaperFontSizeSchema.options;
export const PAPER_LINE_HEIGHT_OPTIONS = PaperLineHeightSchema.options;
export const PAPER_MARGIN_OPTIONS = PaperMarginSchema.options;
export const PAPER_SIZE_OPTIONS = PaperSizeSchema.options;

export const PAPER_FONT_STACKS: Record<PaperFont, string> = {
  default: "inherit",
  simsun:
    'SimSun, "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", serif',
  simhei:
    'SimHei, "Microsoft JhengHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif',
  kaiti:
    'KaiTi, "Kaiti SC", STKaiti, "Noto Serif CJK SC", serif',
  fangsong:
    'FangSong, STFangsong, "Noto Serif CJK SC", serif',
  yahei:
    '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", system-ui, sans-serif',
  dengxian:
    'DengXian, "Microsoft YaHei UI", "Noto Sans CJK SC", system-ui, sans-serif',
  times:
    '"Times New Roman", Times, SimSun, serif',
  mono:
    '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei Mono", monospace',
};

export const PAPER_FONT_SIZE_STYLES: Record<PaperFontSize, string> = {
  wuhao: "10.5pt",
  xiaosi: "12pt",
  sihao: "14pt",
  sanhao: "16pt",
};

export const PAPER_LINE_HEIGHT_STYLES: Record<PaperLineHeight, number> = {
  compact: 1.45,
  standard: 1.65,
  relaxed: 1.9,
};

export const PAPER_MARGIN_STYLES: Record<PaperMargin, string> = {
  narrow: "10mm",
  standard: "14mm",
  wide: "20mm",
};

export const PAPER_SIZE_STYLES: Record<PaperSize, { width: string; minHeight: string }> = {
  a4: { width: "210mm", minHeight: "297mm" },
  a3: { width: "297mm", minHeight: "420mm" },
  b5: { width: "176mm", minHeight: "250mm" },
  letter: { width: "216mm", minHeight: "279mm" },
};

const LegacyPaperFontSizeSchema = z.preprocess((value) => {
  if (value === "small") return "wuhao";
  if (value === "standard") return "xiaosi";
  if (value === "large") return "sihao";
  return value;
}, PaperFontSizeSchema);

const LegacyPaperFontSchema = z.preprocess((value) => {
  if (value === "serif") return "simsun";
  if (value === "sans") return "yahei";
  return value;
}, PaperFontSchema);

/** A teacher/persona preset whose instructions can shape AI assistant behavior. */
export const AgentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  instructions: z.string().default(""),
  builtIn: z.boolean().optional(),
});

export const DEFAULT_AGENTS = [
  {
    id: "builtin-english-teacher",
    name: "英语老师",
    description: "适合英语阅读、语法、词汇、写作和听说能力测评。",
    instructions:
      "Act as an English teacher. Focus on language accuracy, CEFR-appropriate difficulty, clear answer keys, and explanations that help students understand grammar and vocabulary.",
    builtIn: true,
  },
  {
    id: "builtin-math-teacher",
    name: "数学老师",
    description: "适合数学概念、计算、证明、应用题和分层训练。",
    instructions:
      "Act as a math teacher. Use rigorous reasoning, clear formulas, step-by-step solutions when needed, and avoid skipping key derivation steps.",
    builtIn: true,
  },
  {
    id: "builtin-chinese-teacher",
    name: "语文老师",
    description: "适合语文阅读理解、古诗文、作文、语言文字运用等试卷。",
    instructions:
      "Act as a Chinese language teacher. Emphasize reading comprehension, literary analysis, classical Chinese when relevant, writing guidance, and clear scoring criteria.",
    builtIn: true,
  },
] satisfies z.input<typeof AgentConfigSchema>[];

export const AppSettingsSchema = z.object({
  /** UI language. */
  language: z.enum(["zh", "en"]).default("zh"),
  /** Color theme: system (follow OS), light, or dark. */
  theme: ThemeSchema.default("system"),
  /** Debounced auto-save of the working paper. */
  autoSave: z.boolean().default(true),
  /** Explanation detail level injected into the system prompt as a default. */
  explanationTier: ExplanationTierSchema.default("brief"),
  /** Global UI font preset. Overrides --font-sans on <html>. */
  globalFont: GlobalFontSchema.default("system"),
  /** Font preset used only for paper rendering. */
  paperFont: LegacyPaperFontSchema.default("default"),
  /** Base font size preset used only for paper rendering. */
  paperFontSize: LegacyPaperFontSizeSchema.default("xiaosi"),
  /** Line-height preset used only for paper rendering. */
  paperLineHeight: PaperLineHeightSchema.default("standard"),
  /** Page padding/margin preset used only for paper rendering. */
  paperMargin: PaperMarginSchema.default("standard"),
  /** Word-like paper size preset used only for paper rendering. */
  paperSize: PaperSizeSchema.default("a4"),
  /** Legacy field: migrated into an AI agent and no longer shown in settings. */
  customInstructions: z.string().default(""),
});

const AppConfigBaseSchema = z.object({
  version: z.number().int().default(CONFIG_SCHEMA_VERSION),
  configs: z.array(ModelConfigSchema).default([]),
  /** id of the active model config, or null if none selected. */
  activeConfigId: z.string().nullable().default(null),
  settings: AppSettingsSchema.prefault({}),
  agents: z.array(AgentConfigSchema).default([]),
  activeAgentId: z.string().nullable().default(null),
  deletedBuiltInAgentIds: z.array(z.string()).default([]),
});

export const AppConfigSchema = AppConfigBaseSchema.transform((config) => {
  const builtIns = DEFAULT_AGENTS.map((agent) => AgentConfigSchema.parse(agent));
  const agents = [...config.agents];
  for (const builtIn of builtIns) {
    if (
      !config.deletedBuiltInAgentIds.includes(builtIn.id) &&
      !agents.some((agent) => agent.id === builtIn.id)
    ) {
      agents.push(builtIn);
    }
  }

  const legacy = config.settings.customInstructions.trim();
  const legacyAgentId = "legacy-custom-instructions";
  if (legacy && !agents.some((agent) => agent.id === legacyAgentId)) {
    agents.push({
      id: legacyAgentId,
      name: "自定义补充指令",
      description: "从旧版本设置迁移而来。",
      instructions: legacy,
    });
  }

  const activeAgentId =
    config.activeAgentId && agents.some((agent) => agent.id === config.activeAgentId)
      ? config.activeAgentId
      : legacy
        ? legacyAgentId
      : null;

  return { ...config, agents, activeAgentId };
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ExplanationTier = z.infer<typeof ExplanationTierSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

export function defaultAppConfig(): AppConfig {
  return AppConfigSchema.parse({});
}
