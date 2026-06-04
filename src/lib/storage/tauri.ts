import { invoke } from "@tauri-apps/api/core";
import { AppConfigSchema, type AppConfig } from "../types/config";
import { ExamPaperSchema, type ExamPaper } from "../types/exam";
import {
  ChatIndexSchema,
  ChatSessionSchema,
  PaperIndexSchema,
  type ChatIndex,
  type ChatSession,
  type PaperIndex,
} from "../types/library";

/**
 * Typed wrappers around the Rust storage/keychain commands. The Rust side reads
 * and writes raw JSON strings; validation happens here with Zod so the rest of
 * the app works with trusted, typed data.
 */

// ---- Data directory / bootstrap ----

export function getDataDir(): Promise<string | null> {
  return invoke("get_data_dir");
}

export function setDataDir(dataDir: string): Promise<void> {
  return invoke("set_data_dir", { dataDir });
}

export function defaultDataDir(): Promise<string> {
  return invoke("default_data_dir");
}

// ---- App config ----

export async function loadConfig(dataDir: string): Promise<AppConfig | null> {
  const raw = await invoke<string | null>("load_config", { dataDir });
  if (raw == null) return null;
  return AppConfigSchema.parse(JSON.parse(raw));
}

export function saveConfig(dataDir: string, config: AppConfig): Promise<void> {
  return invoke("save_config", { dataDir, contents: JSON.stringify(config, null, 2) });
}

// ---- Working paper ----

export async function loadWorkingPaper(
  dataDir: string,
): Promise<ExamPaper | null> {
  const raw = await invoke<string | null>("load_working_paper", { dataDir });
  if (raw == null) return null;
  return ExamPaperSchema.parse(JSON.parse(raw));
}

export function saveWorkingPaper(
  dataDir: string,
  paper: ExamPaper,
): Promise<void> {
  return invoke("save_working_paper", {
    dataDir,
    contents: JSON.stringify(paper, null, 2),
  });
}

// ---- Paper library ----

export async function loadPaperIndex(
  dataDir: string,
): Promise<PaperIndex | null> {
  const raw = await invoke<string | null>("load_paper_index", { dataDir });
  if (raw == null) return null;
  return PaperIndexSchema.parse(JSON.parse(raw));
}

export function savePaperIndex(
  dataDir: string,
  index: PaperIndex,
): Promise<void> {
  return invoke("save_paper_index", {
    dataDir,
    contents: JSON.stringify(index, null, 2),
  });
}

export async function loadPaper(
  dataDir: string,
  paperId: string,
): Promise<ExamPaper | null> {
  const raw = await invoke<string | null>("load_paper", { dataDir, paperId });
  if (raw == null) return null;
  return ExamPaperSchema.parse(JSON.parse(raw));
}

export function savePaper(
  dataDir: string,
  paperId: string,
  paper: ExamPaper,
): Promise<void> {
  return invoke("save_paper", {
    dataDir,
    paperId,
    contents: JSON.stringify(paper, null, 2),
  });
}

export function deletePaper(dataDir: string, paperId: string): Promise<void> {
  return invoke("delete_paper", { dataDir, paperId });
}

// ---- Paper-scoped chat history ----

export async function loadChatIndex(
  dataDir: string,
  paperId: string,
): Promise<ChatIndex | null> {
  const raw = await invoke<string | null>("load_chat_index", {
    dataDir,
    paperId,
  });
  if (raw == null) return null;
  return ChatIndexSchema.parse(JSON.parse(raw));
}

export function saveChatIndex(
  dataDir: string,
  paperId: string,
  index: ChatIndex,
): Promise<void> {
  return invoke("save_chat_index", {
    dataDir,
    paperId,
    contents: JSON.stringify(index, null, 2),
  });
}

export async function loadChatSession(
  dataDir: string,
  paperId: string,
  sessionId: string,
): Promise<ChatSession | null> {
  const raw = await invoke<string | null>("load_chat_session", {
    dataDir,
    paperId,
    sessionId,
  });
  if (raw == null) return null;
  return ChatSessionSchema.parse(JSON.parse(raw));
}

export function saveChatSession(
  dataDir: string,
  paperId: string,
  session: ChatSession,
): Promise<void> {
  return invoke("save_chat_session", {
    dataDir,
    paperId,
    sessionId: session.id,
    contents: JSON.stringify(session, null, 2),
  });
}

export function deleteChatSession(
  dataDir: string,
  paperId: string,
  sessionId: string,
): Promise<void> {
  return invoke("delete_chat_session", { dataDir, paperId, sessionId });
}

// ---- Keychain ----

export function storeApiKey(account: string, secret: string): Promise<void> {
  return invoke("store_api_key", { account, secret });
}

export function getApiKey(account: string): Promise<string | null> {
  return invoke("get_api_key", { account });
}

export function deleteApiKey(account: string): Promise<void> {
  return invoke("delete_api_key", { account });
}

export function hasApiKey(account: string): Promise<boolean> {
  return invoke("has_api_key", { account });
}
