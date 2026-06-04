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
