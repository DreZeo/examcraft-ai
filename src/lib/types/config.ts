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

export const AppSettingsSchema = z.object({
  /** UI language. */
  language: z.enum(["zh", "en"]).default("zh"),
  /** Color theme: system (follow OS), light, or dark. */
  theme: ThemeSchema.default("system"),
  /** Debounced auto-save of the working paper. */
  autoSave: z.boolean().default(true),
  /** Explanation detail level injected into the system prompt as a default. */
  explanationTier: ExplanationTierSchema.default("brief"),
  /** Optional user instructions appended after the built-in system prompt. */
  customInstructions: z.string().default(""),
});

export const AppConfigSchema = z.object({
  version: z.number().int().default(CONFIG_SCHEMA_VERSION),
  configs: z.array(ModelConfigSchema).default([]),
  /** id of the active model config, or null if none selected. */
  activeConfigId: z.string().nullable().default(null),
  settings: AppSettingsSchema.prefault({}),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ExplanationTier = z.infer<typeof ExplanationTierSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

export function defaultAppConfig(): AppConfig {
  return AppConfigSchema.parse({});
}
