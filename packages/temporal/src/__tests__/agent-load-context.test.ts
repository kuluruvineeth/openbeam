import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLoadAgentContextActivity } from "../activities/agents/load-agent-context";

function createMockDb() {
  return {
    backgroundAgent: {
      findUnique: vi.fn((): unknown => null),
    },
    backgroundAgentCheckpoint: {
      findFirst: vi.fn((): unknown => null),
    },
  };
}

describe("loadAgentContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty context when agent not found", async () => {
    const db = createMockDb();
    const activity = createLoadAgentContextActivity({ db: db as never });

    const result = await activity({ sessionId: "session-1" });

    expect(result).toEqual({});
    expect(db.backgroundAgent.findUnique).toHaveBeenCalledWith({
      where: { id: "session-1" },
    });
  });

  it("loads full context when agent and checkpoint exist", async () => {
    const db = createMockDb();
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "session-1",
      name: "research-agent",
      prompt: "Do research",
      preset: "researcher",
      teamId: "team-1",
      userId: "user-1",
      status: "RUNNING",
    });
    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue({
      state: { step: 2, progress: 0.5 },
      memorySnapshot: { key1: "val1" },
      contextWindow: [{ role: "user", content: "hello" }],
      stepIndex: 2,
    });

    const activity = createLoadAgentContextActivity({ db: db as never });
    const result = await activity({ sessionId: "session-1" });

    expect(result).toEqual({
      agentId: "session-1",
      agentName: "research-agent",
      prompt: "Do research",
      preset: "researcher",
      teamId: "team-1",
      userId: "user-1",
      status: "RUNNING",
      step: 2,
      checkpointState: { step: 2, progress: 0.5 },
      memorySnapshot: { key1: "val1" },
      contextWindow: [{ role: "user", content: "hello" }],
      workingMemory: {},
    });
  });

  it("returns defaults when no checkpoint exists", async () => {
    const db = createMockDb();
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "session-1",
      name: "agent",
      prompt: null,
      preset: null,
      teamId: "team-1",
      userId: "user-1",
      status: "IDLE",
    });

    const activity = createLoadAgentContextActivity({ db: db as never });
    const result = await activity({ sessionId: "session-1" });

    expect(result).toMatchObject({
      agentId: "session-1",
      step: 0,
      checkpointState: {},
      memorySnapshot: {},
      contextWindow: [],
      workingMemory: {},
    });
  });

  it("queries checkpoint ordered by version desc", async () => {
    const db = createMockDb();
    db.backgroundAgent.findUnique.mockResolvedValue(null);

    const activity = createLoadAgentContextActivity({ db: db as never });
    await activity({ sessionId: "session-1" });

    expect(db.backgroundAgentCheckpoint.findFirst).toHaveBeenCalledWith({
      where: { agentId: "session-1" },
      orderBy: { version: "desc" },
      select: {
        state: true,
        memorySnapshot: true,
        contextWindow: true,
        stepIndex: true,
      },
    });
  });

  it("returns empty context for different session IDs", async () => {
    const db = createMockDb();
    const activity = createLoadAgentContextActivity({ db: db as never });

    const result1 = await activity({ sessionId: "session-a" });
    const result2 = await activity({ sessionId: "session-b" });

    expect(result1).toEqual({});
    expect(result2).toEqual({});
    expect(db.backgroundAgent.findUnique).toHaveBeenCalledTimes(2);
  });
});
