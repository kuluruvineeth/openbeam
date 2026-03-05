import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLoadAgentContextActivity } from "../load-agent-context";

function createMockDb() {
  return {
    backgroundAgent: {
      findUnique: vi.fn(),
    },
    backgroundAgentCheckpoint: {
      findFirst: vi.fn(),
    },
  };
}

describe("loadAgentContext", () => {
  let db: ReturnType<typeof createMockDb>;
  let loadAgentContext: ReturnType<typeof createLoadAgentContextActivity>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    loadAgentContext = createLoadAgentContextActivity({
      db: db as unknown as Parameters<
        typeof createLoadAgentContextActivity
      >[0]["db"],
    });
  });

  it("returns empty object when agent not found", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue(null);
    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue(null);

    const result = await loadAgentContext({ sessionId: "missing-agent" });

    expect(result).toEqual({});
  });

  it("loads agent fields and checkpoint state", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Research Bot",
      prompt: "You are a research assistant",
      preset: "researcher",
      teamId: "team-1",
      userId: "user-1",
      status: "RUNNING",
    });

    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue({
      state: { lastQuery: "quantum computing" },
      memorySnapshot: { facts: ["fact1"] },
      contextWindow: [{ role: "user", content: "Hello" }],
      stepIndex: 3,
    });

    const result = await loadAgentContext({ sessionId: "agent-1" });

    expect(result).toEqual({
      agentId: "agent-1",
      agentName: "Research Bot",
      prompt: "You are a research assistant",
      preset: "researcher",
      teamId: "team-1",
      userId: "user-1",
      status: "RUNNING",
      step: 3,
      checkpointState: { lastQuery: "quantum computing" },
      memorySnapshot: { facts: ["fact1"] },
      contextWindow: [{ role: "user", content: "Hello" }],
      workingMemory: {},
    });
  });

  it("defaults checkpoint fields when no checkpoint exists", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Bot",
      prompt: "",
      preset: "general",
      teamId: "t1",
      userId: "u1",
      status: "IDLE",
    });

    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue(null);

    const result = await loadAgentContext({ sessionId: "agent-1" });

    expect(result.step).toBe(0);
    expect(result.checkpointState).toEqual({});
    expect(result.memorySnapshot).toEqual({});
    expect(result.contextWindow).toEqual([]);
  });

  it("queries checkpoint ordered by version desc", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Bot",
      prompt: "",
      preset: "general",
      teamId: "t1",
      userId: "u1",
      status: "RUNNING",
    });

    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue({
      state: {},
      memorySnapshot: null,
      contextWindow: null,
      stepIndex: 5,
    });

    await loadAgentContext({ sessionId: "agent-1" });

    expect(db.backgroundAgentCheckpoint.findFirst).toHaveBeenCalledWith({
      where: { agentId: "agent-1" },
      orderBy: { version: "desc" },
      select: {
        state: true,
        memorySnapshot: true,
        contextWindow: true,
        stepIndex: true,
      },
    });
  });

  it("runs agent and checkpoint queries in parallel", async () => {
    const agentPromise = new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            id: "a1",
            name: "Bot",
            prompt: "",
            preset: "general",
            teamId: "t1",
            userId: "u1",
            status: "IDLE",
          }),
        10
      )
    );
    const checkpointPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), 10)
    );

    db.backgroundAgent.findUnique.mockReturnValue(agentPromise);
    db.backgroundAgentCheckpoint.findFirst.mockReturnValue(checkpointPromise);

    const start = Date.now();
    await loadAgentContext({ sessionId: "a1" });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
