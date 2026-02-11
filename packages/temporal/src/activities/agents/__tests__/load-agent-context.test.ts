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
    missionMemory: {
      findMany: vi.fn(),
    },
  };
}

describe("loadAgentContext", () => {
  let db: ReturnType<typeof createMockDb>;
  let loadAgentContext: ReturnType<typeof createLoadAgentContextActivity>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    loadAgentContext = createLoadAgentContextActivity({ db: db as any });
  });

  it("returns empty object when agent not found", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue(null);
    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue(null);
    db.missionMemory.findMany.mockResolvedValue([]);

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

    db.missionMemory.findMany.mockResolvedValue([]);

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

  it("loads working memory from missionMemory table", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Bot",
      prompt: "",
      preset: "general",
      teamId: "t1",
      userId: "u1",
      status: "RUNNING",
    });

    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue(null);

    db.missionMemory.findMany.mockResolvedValue([
      { key: "task_state", value: { active: true }, scope: "agent" },
      { key: "findings", value: ["item1", "item2"], scope: "mission" },
    ]);

    const result = await loadAgentContext({ sessionId: "agent-1" });

    expect(result.workingMemory).toEqual({
      task_state: { active: true },
      findings: ["item1", "item2"],
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
    db.missionMemory.findMany.mockResolvedValue([]);

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

    db.missionMemory.findMany.mockResolvedValue([]);

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

  it("respects maxMemoryKeys option", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Bot",
      prompt: "",
      preset: "general",
      teamId: "t1",
      userId: "u1",
      status: "RUNNING",
    });

    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue(null);
    db.missionMemory.findMany.mockResolvedValue([]);

    const customLoader = createLoadAgentContextActivity(
      { db: db as any },
      { maxMemoryKeys: 10 }
    );

    await customLoader({ sessionId: "agent-1" });

    expect(db.missionMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it("uses default maxMemoryKeys of 50", async () => {
    db.backgroundAgent.findUnique.mockResolvedValue({
      id: "agent-1",
      name: "Bot",
      prompt: "",
      preset: "general",
      teamId: "t1",
      userId: "u1",
      status: "RUNNING",
    });

    db.backgroundAgentCheckpoint.findFirst.mockResolvedValue(null);
    db.missionMemory.findMany.mockResolvedValue([]);

    await loadAgentContext({ sessionId: "agent-1" });

    expect(db.missionMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
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
    db.missionMemory.findMany.mockResolvedValue([]);

    const start = Date.now();
    await loadAgentContext({ sessionId: "a1" });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
