import { v4 as uuid } from "uuid";
import type {
  ApiMessage,
  ChatIndex,
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
} from "../types/library";

export function createChatSession(
  paperId: string,
  now: string,
  title = "新对话",
  id = uuid(),
): ChatSession {
  return {
    version: 1,
    id,
    paperId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
    apiHistory: [],
  };
}

export function createChatIndex(session: ChatSession): ChatIndex {
  return {
    version: 1,
    activeSessionId: session.id,
    sessions: [sessionToMeta(session)],
  };
}

export function sessionToMeta(session: ChatSession): ChatSessionMeta {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function upsertChatSessionMeta(
  index: ChatIndex,
  session: ChatSession,
): ChatIndex {
  const meta = sessionToMeta(session);
  const exists = index.sessions.some((item) => item.id === session.id);
  const sessions = exists
    ? index.sessions.map((item) => (item.id === session.id ? meta : item))
    : [meta, ...index.sessions];
  return {
    ...index,
    activeSessionId: session.id,
    sessions: sortSessions(sessions),
  };
}

export function removeChatSessionMeta(
  index: ChatIndex,
  sessionId: string,
): ChatIndex {
  const sessions = sortSessions(index.sessions.filter((item) => item.id !== sessionId));
  const activeSessionId =
    index.activeSessionId === sessionId
      ? (sessions[0]?.id ?? null)
      : index.activeSessionId;
  return { ...index, activeSessionId, sessions };
}

export function renameChatSession(
  session: ChatSession,
  title: string,
  now: string,
): ChatSession {
  return {
    ...session,
    title: title.trim() || session.title,
    updatedAt: now,
  };
}

export function updateChatSessionContent(
  session: ChatSession,
  messages: ChatMessage[],
  apiHistory: ApiMessage[],
  now: string,
): ChatSession {
  return {
    ...session,
    messages,
    apiHistory,
    updatedAt: now,
  };
}

function sortSessions(sessions: ChatSessionMeta[]): ChatSessionMeta[] {
  return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
