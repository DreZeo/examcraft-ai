import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  defaultAppConfig,
  type AppConfig,
  type AppSettings,
  type ModelConfig,
} from "../lib/types/config";
import * as storage from "../lib/storage/tauri";
import i18n from "../i18n";

/**
 * Global app configuration: data directory, model configs, and settings.
 * Persists config.json to the chosen data dir on every mutation. API keys are
 * handled separately via the keychain (never stored in this object).
 */
interface ConfigState {
  dataDir: string | null;
  config: AppConfig;
  loaded: boolean;

  /** Resolve the bootstrap pointer + load config.json (first-launch aware). */
  init: () => Promise<void>;
  /** Set the data directory (first launch or relocation) and persist. */
  chooseDataDir: (dir: string) => Promise<void>;

  addConfig: (
    config: Omit<ModelConfig, "id">,
    apiKey: string,
  ) => Promise<string>;
  updateConfig: (
    id: string,
    patch: Partial<Omit<ModelConfig, "id">>,
    apiKey?: string,
  ) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  setActiveConfig: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  activeConfig: () => ModelConfig | null;
}

export const useConfigStore = create<ConfigState>((set, get) => {
  /** Persist current config to disk if a data dir is known. */
  async function persist(next: AppConfig) {
    set({ config: next });
    const dir = get().dataDir;
    if (dir) await storage.saveConfig(dir, next);
  }

  return {
    dataDir: null,
    config: defaultAppConfig(),
    loaded: false,

    init: async () => {
      const dir = await storage.getDataDir();
      if (!dir) {
        set({ loaded: true, dataDir: null });
        return;
      }
      const loaded = await storage.loadConfig(dir);
      const config = loaded ?? defaultAppConfig();
      if (config.settings.language) {
        await i18n.changeLanguage(config.settings.language);
      }
      set({ dataDir: dir, config, loaded: true });
    },

    chooseDataDir: async (dir) => {
      await storage.setDataDir(dir);
      const existing = await storage.loadConfig(dir);
      const config = existing ?? get().config;
      set({ dataDir: dir });
      await persist(config);
    },

    addConfig: async (config, apiKey) => {
      const id = uuid();
      const model: ModelConfig = { ...config, id };
      const cur = get().config;
      const isFirst = cur.configs.length === 0;
      await storage.storeApiKey(id, apiKey);
      await persist({
        ...cur,
        configs: [...cur.configs, model],
        activeConfigId: isFirst ? id : cur.activeConfigId,
      });
      return id;
    },

    updateConfig: async (id, patch, apiKey) => {
      const cur = get().config;
      if (apiKey !== undefined) await storage.storeApiKey(id, apiKey);
      await persist({
        ...cur,
        configs: cur.configs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      });
    },

    deleteConfig: async (id) => {
      const cur = get().config;
      await storage.deleteApiKey(id);
      const configs = cur.configs.filter((c) => c.id !== id);
      const activeConfigId =
        cur.activeConfigId === id
          ? (configs[0]?.id ?? null)
          : cur.activeConfigId;
      await persist({ ...cur, configs, activeConfigId });
    },

    setActiveConfig: async (id) => {
      await persist({ ...get().config, activeConfigId: id });
    },

    updateSettings: async (patch) => {
      const cur = get().config;
      const settings = { ...cur.settings, ...patch };
      if (patch.language && patch.language !== cur.settings.language) {
        await i18n.changeLanguage(patch.language);
      }
      await persist({ ...cur, settings });
    },

    activeConfig: () => {
      const { config } = get();
      return config.configs.find((c) => c.id === config.activeConfigId) ?? null;
    },
  };
});
