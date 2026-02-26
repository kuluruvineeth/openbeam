import { describe, expect, it, mock } from "bun:test";
import type { ToolContext } from "../../../types";
import { voiceDictateTool } from "../dictate";
import { voiceNoteTool } from "../note";
import { voiceSearchTool } from "../search";

const ALL_TOOLS = [
  { tool: voiceDictateTool, name: "voice_dictate" },
  { tool: voiceSearchTool, name: "voice_search" },
  { tool: voiceNoteTool, name: "voice_note" },
];

function createTestContext(
  voiceOverrides?: Partial<ToolContext["services"]["voice"]>
): ToolContext {
  return {
    teamId: "team_abc",
    userId: "user_123",
    services: {
      voice: {
        startDictation: mock(() =>
          Promise.resolve({ id: "sess_1", roomName: "room-abc" })
        ),
        startAction: mock(() =>
          Promise.resolve({ id: "sess_2", roomName: "room-def" })
        ),
        createNote: mock(() =>
          Promise.resolve({
            id: "note_1",
            title: "Test Note",
            createdAt: new Date("2026-01-01"),
          })
        ),
        listNotes: mock(() =>
          Promise.resolve([
            {
              id: "note_1",
              title: "Note A",
              createdAt: new Date("2026-01-01"),
            },
            {
              id: "note_2",
              title: "Note B",
              createdAt: new Date("2026-01-02"),
            },
          ])
        ),
        getNote: mock(() =>
          Promise.resolve({
            id: "note_1",
            title: "Note A",
            content: "Transcribed content",
            createdAt: new Date("2026-01-01"),
          })
        ),
        ...voiceOverrides,
      },
    } as never,
  };
}

function createContextWithoutVoice(): ToolContext {
  return {
    teamId: "team_abc",
    userId: "user_123",
    services: {} as never,
  };
}

describe("voice tool metadata", () => {
  for (const { tool, name } of ALL_TOOLS) {
    describe(name, () => {
      it("has correct name", () => {
        expect(tool.metadata.name).toBe(name);
      });

      it("uses voice category", () => {
        expect(tool.metadata.category).toBe("voice");
      });

      it("has a description", () => {
        expect(tool.metadata.description.length).toBeGreaterThan(10);
      });

      it("requires voice:use permission", () => {
        expect(tool.metadata.requiredPermissions).toContain("voice:use");
      });

      it("has search keywords", () => {
        const keywords = tool.metadata.searchKeywords ?? [];
        expect(keywords).toContain("voice");
        expect(keywords.length).toBeGreaterThan(1);
      });

      it("has a register function", () => {
        expect(typeof tool.register).toBe("function");
      });

      it("has an execute function", () => {
        expect(typeof tool.execute).toBe("function");
      });
    });
  }
});

describe("voice_dictate", () => {
  it("fails when voice service is unavailable", async () => {
    const result = await voiceDictateTool.execute(
      { language: "en", formatting: true },
      createContextWithoutVoice()
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  it("starts a dictation session", async () => {
    const ctx = createTestContext();
    const result = await voiceDictateTool.execute(
      { targetField: "search", language: "en", formatting: true },
      ctx
    );

    expect(result.success).toBe(true);
    const data = result.data as {
      sessionId: string;
      roomName: string;
      mode: string;
      targetField: string;
    };
    expect(data.sessionId).toBe("sess_1");
    expect(data.roomName).toBe("room-abc");
    expect(data.mode).toBe("dictation");
    expect(data.targetField).toBe("search");
  });

  it("passes params to voice service", async () => {
    const ctx = createTestContext();
    await voiceDictateTool.execute(
      { targetField: "note", language: "fr", formatting: false },
      ctx
    );

    const voiceService = ctx.services.voice as NonNullable<
      typeof ctx.services.voice
    >;
    expect(voiceService.startDictation).toHaveBeenCalledWith({
      userId: "user_123",
      teamId: "team_abc",
      targetField: "note",
      language: "fr",
      formatting: false,
    });
  });

  it("has dictation-specific keywords", () => {
    const keywords = voiceDictateTool.metadata.searchKeywords ?? [];
    expect(keywords).toContain("dictate");
    expect(keywords).toContain("transcribe");
    expect(keywords).toContain("microphone");
  });
});

describe("voice_search", () => {
  it("fails when voice service is unavailable", async () => {
    const result = await voiceSearchTool.execute(
      { conversational: true },
      createContextWithoutVoice()
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  it("starts an action session", async () => {
    const ctx = createTestContext();
    const result = await voiceSearchTool.execute(
      { initialQuery: "find Q4 report", conversational: true },
      ctx
    );

    expect(result.success).toBe(true);
    const data = result.data as {
      sessionId: string;
      roomName: string;
      mode: string;
      conversational: boolean;
    };
    expect(data.sessionId).toBe("sess_2");
    expect(data.roomName).toBe("room-def");
    expect(data.mode).toBe("action");
    expect(data.conversational).toBe(true);
  });

  it("passes params to voice service", async () => {
    const ctx = createTestContext();
    await voiceSearchTool.execute(
      { initialQuery: "recent PRs", conversational: false },
      ctx
    );

    const voiceService = ctx.services.voice as NonNullable<
      typeof ctx.services.voice
    >;
    expect(voiceService.startAction).toHaveBeenCalledWith({
      userId: "user_123",
      teamId: "team_abc",
      initialQuery: "recent PRs",
      conversational: false,
    });
  });

  it("requires search:read permission", () => {
    expect(voiceSearchTool.metadata.requiredPermissions).toContain(
      "search:read"
    );
  });

  it("has search-specific keywords", () => {
    const keywords = voiceSearchTool.metadata.searchKeywords ?? [];
    expect(keywords).toContain("search");
    expect(keywords).toContain("find");
    expect(keywords).toContain("query");
  });
});

describe("voice_note", () => {
  it("fails when voice service is unavailable", async () => {
    const result = await voiceNoteTool.execute(
      { action: "list", limit: 20 },
      createContextWithoutVoice()
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  describe("create action", () => {
    it("fails without title", async () => {
      const ctx = createTestContext();
      const result = await voiceNoteTool.execute(
        { action: "create", content: "some text", limit: 20 },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });

    it("fails without content", async () => {
      const ctx = createTestContext();
      const result = await voiceNoteTool.execute(
        { action: "create", title: "My Note", limit: 20 },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });

    it("creates a note successfully", async () => {
      const ctx = createTestContext();
      const result = await voiceNoteTool.execute(
        {
          action: "create",
          title: "Meeting Notes",
          content: "Discussed Q4 targets",
          durationSeconds: 120,
          limit: 20,
        },
        ctx
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        id: string;
        title: string;
        created: boolean;
      };
      expect(data.id).toBe("note_1");
      expect(data.title).toBe("Test Note");
      expect(data.created).toBe(true);
    });

    it("passes all params to voice service", async () => {
      const ctx = createTestContext();
      await voiceNoteTool.execute(
        {
          action: "create",
          title: "Quick memo",
          content: "Call back tomorrow",
          durationSeconds: 30,
          limit: 20,
        },
        ctx
      );

      const voiceService = ctx.services.voice as NonNullable<
        typeof ctx.services.voice
      >;
      expect(voiceService.createNote).toHaveBeenCalledWith({
        userId: "user_123",
        teamId: "team_abc",
        title: "Quick memo",
        content: "Call back tomorrow",
        durationSeconds: 30,
      });
    });
  });

  describe("list action", () => {
    it("returns notes with count", async () => {
      const ctx = createTestContext();
      const result = await voiceNoteTool.execute(
        { action: "list", limit: 20 },
        ctx
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        notes: Array<{ id: string; title: string }>;
        count: number;
      };
      expect(data.count).toBe(2);
      expect(data.notes).toHaveLength(2);
      expect(data.notes[0].title).toBe("Note A");
    });

    it("passes limit to service", async () => {
      const ctx = createTestContext();
      await voiceNoteTool.execute({ action: "list", limit: 5 }, ctx);

      const voiceService = ctx.services.voice as NonNullable<
        typeof ctx.services.voice
      >;
      expect(voiceService.listNotes).toHaveBeenCalledWith({
        userId: "user_123",
        teamId: "team_abc",
        limit: 5,
      });
    });
  });

  describe("get action", () => {
    it("fails without noteId", async () => {
      const ctx = createTestContext();
      const result = await voiceNoteTool.execute(
        { action: "get", limit: 20 },
        ctx
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });

    it("returns note by id", async () => {
      const ctx = createTestContext();
      const result = await voiceNoteTool.execute(
        { action: "get", noteId: "note_1", limit: 20 },
        ctx
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        id: string;
        title: string;
        content: string;
      };
      expect(data.id).toBe("note_1");
      expect(data.content).toBe("Transcribed content");
    });

    it("returns NOT_FOUND when note missing", async () => {
      const ctx = createTestContext({
        getNote: mock(() => Promise.resolve(null)),
      });
      const result = await voiceNoteTool.execute(
        { action: "get", noteId: "missing", limit: 20 },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });
});
