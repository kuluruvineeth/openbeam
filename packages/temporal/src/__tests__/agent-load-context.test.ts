import { describe, expect, it, vi } from "vitest";

const mockGetCheckpoints: ReturnType<typeof vi.fn> = vi.fn(() => []);

vi.mock("@openplane/db", () => ({
  getBackgroundAgentCheckpoints: (...args: unknown[]) =>
    mockGetCheckpoints(...args),
}));

import { createLoadAgentContextActivity } from "../activities/agents/load-agent-context";

function createMockDb() {
  return {
    backgroundAgent: {
      findFirst: vi.fn(() => null),
    },
    missionAgent: {
      findFirst: vi.fn(() => null),
    },
    missionTask: {
      findUnique: vi.fn(() => null),
    },
    missionMemory: {
      findMany: vi.fn((): unknown[] => []),
    },
    missionComment: {
      findMany: vi.fn((): unknown[] => []),
    },
  };
}

describe("loadAgentContext", () => {
  it("returns empty context for minimal input", async () => {
    const db = createMockDb();
    mockGetCheckpoints.mockResolvedValue([]);

    const activity = createLoadAgentContextActivity({ db: db as never });

    const result = await activity({
      sessionId: "session-1",
    });

    expect(result).toEqual({});
  });

  it("loads checkpoint state when available", async () => {
    const db = createMockDb();
    mockGetCheckpoints.mockResolvedValue([
      { version: 3, state: { step: 2, progress: 0.5 } },
    ]);

    const activity = createLoadAgentContextActivity({ db: db as never });

    const result = await activity({ sessionId: "session-1" });

    expect(result).toEqual({});
  });

  it("returns empty object with no checkpoints", async () => {
    const db = createMockDb();
    mockGetCheckpoints.mockResolvedValue([]);

    const activity = createLoadAgentContextActivity({ db: db as never });

    const result = await activity({ sessionId: "session-1" });

    expect(result).toEqual({});
  });

  it("calls getBackgroundAgentCheckpoints with correct args", async () => {
    const db = createMockDb();
    mockGetCheckpoints.mockResolvedValue([]);

    const activity = createLoadAgentContextActivity({ db: db as never });

    await activity({ sessionId: "session-1" });

    expect(mockGetCheckpoints).toHaveBeenCalledWith(db, "session-1", 1);
  });

  it("returns empty context for different session IDs", async () => {
    const db = createMockDb();
    mockGetCheckpoints.mockResolvedValue([]);

    const activity = createLoadAgentContextActivity({ db: db as never });

    const result1 = await activity({ sessionId: "session-a" });
    const result2 = await activity({ sessionId: "session-b" });

    expect(result1).toEqual({});
    expect(result2).toEqual({});
    expect(mockGetCheckpoints).toHaveBeenCalledTimes(2);
  });
});
