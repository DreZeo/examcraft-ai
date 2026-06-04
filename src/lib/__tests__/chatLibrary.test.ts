import { describe, expect, it } from "vitest";
import {
  createChatIndex,
  createChatSession,
  removeChatSessionMeta,
  renameChatSession,
  updateChatSessionContent,
  upsertChatSessionMeta,
} from "../api/chatLibrary";

describe("chat library helpers", () => {
  it("creates and renames a paper-scoped chat session", () => {
    const session = createChatSession("p1", "2026-01-01T00:00:00Z", "Draft", "c1");
    const renamed = renameChatSession(session, "Better title", "2026-01-02T00:00:00Z");

    expect(session.paperId).toBe("p1");
    expect(renamed.title).toBe("Better title");
    expect(renamed.updatedAt).toBe("2026-01-02T00:00:00Z");
  });

  it("keeps messages and api history in the same session payload", () => {
    const session = createChatSession("p1", "2026-01-01T00:00:00Z", "Chat", "c1");
    const updated = updateChatSessionContent(
      session,
      [{ id: "m1", kind: "text", role: "user", content: "hello" }],
      [{ role: "user", content: "hello" }],
      "2026-01-02T00:00:00Z",
    );

    expect(updated.messages).toHaveLength(1);
    expect(updated.apiHistory).toHaveLength(1);
    expect(updated.updatedAt).toBe("2026-01-02T00:00:00Z");
  });

  it("removes active sessions and falls back to the most recent remaining one", () => {
    const c1 = createChatSession("p1", "2026-01-01T00:00:00Z", "One", "c1");
    const c2 = createChatSession("p1", "2026-01-02T00:00:00Z", "Two", "c2");
    let index = createChatIndex(c1);
    index = upsertChatSessionMeta(index, c2);

    const next = removeChatSessionMeta(index, "c2");
    expect(next.activeSessionId).toBe("c1");
    expect(next.sessions).toHaveLength(1);
  });
});
