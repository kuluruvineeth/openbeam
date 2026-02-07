import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCheckpoints = vi.fn((..._args: unknown[]): unknown[] => []);
const mockCreateCheckpoint = vi.fn((..._args: unknown[]): unknown => null);

vi.mock("@openplane/db", () => ({
  getBackgroundAgentCheckpoints: (...args: unknown[]) =>
    mockGetCheckpoints(...args),
  createBackgroundAgentCheckpoint: (...args: unknown[]) =>
    mockCreateCheckpoint(...args),
}));

import { createSaveAgentCheckpointActivity } from "../activities/agents/save-agent-checkpoint";

beforeEach(() => {
  mockGetCheckpoints.mockReset();
  mockCreateCheckpoint.mockReset();
});

describe("saveAgentCheckpoint", () => {
  it("creates checkpoint with incremented version", async () => {
    mockGetCheckpoints.mockResolvedValue([{ version: 3 }]);
    mockCreateCheckpoint.mockResolvedValue(undefined);

    const db = {} as never;
    const activity = createSaveAgentCheckpointActivity({ db });

    await activity({
      sessionId: "session-1",
      checkpoint: {
        step: 4,
        state: { progress: 0.8 },
        timestamp: Date.now(),
      },
    });

    expect(mockGetCheckpoints).toHaveBeenCalledWith(db, "session-1", 1);
    expect(mockCreateCheckpoint).toHaveBeenCalledWith(db, "session-1", {
      version: 4,
      state: { progress: 0.8 },
      stepIndex: 4,
    });
  });

  it("starts at version 1 when no existing checkpoints", async () => {
    mockGetCheckpoints.mockResolvedValue([]);
    mockCreateCheckpoint.mockResolvedValue(undefined);

    const activity = createSaveAgentCheckpointActivity({ db: {} as never });

    await activity({
      sessionId: "session-1",
      checkpoint: {
        step: 1,
        state: {},
        timestamp: Date.now(),
      },
    });

    expect(mockCreateCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      "session-1",
      expect.objectContaining({ version: 1 })
    );
  });

  it("includes memorySnapshot in checkpoint state", async () => {
    mockGetCheckpoints.mockResolvedValue([{ version: 1 }]);
    mockCreateCheckpoint.mockResolvedValue(undefined);

    const activity = createSaveAgentCheckpointActivity({ db: {} as never });

    await (activity as (...args: unknown[]) => Promise<unknown>)({
      sessionId: "session-1",
      checkpoint: {
        step: 2,
        state: { query: "test" },
        timestamp: Date.now(),
      },
      memorySnapshot: { key1: "val1", key2: 42 },
    });

    expect(mockCreateCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      "session-1",
      expect.objectContaining({
        state: {
          query: "test",
          _memorySnapshot: { key1: "val1", key2: 42 },
        },
      })
    );
  });

  it("includes contextWindow in checkpoint state", async () => {
    mockGetCheckpoints.mockResolvedValue([{ version: 1 }]);
    mockCreateCheckpoint.mockResolvedValue(undefined);

    const activity = createSaveAgentCheckpointActivity({ db: {} as never });

    const contextWindow = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];

    await (activity as (...args: unknown[]) => Promise<unknown>)({
      sessionId: "session-1",
      checkpoint: {
        step: 2,
        state: {},
        timestamp: Date.now(),
      },
      contextWindow,
    });

    expect(mockCreateCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      "session-1",
      expect.objectContaining({
        state: {
          _contextWindow: contextWindow,
        },
      })
    );
  });

  it("includes both memorySnapshot and contextWindow together", async () => {
    mockGetCheckpoints.mockResolvedValue([{ version: 5 }]);
    mockCreateCheckpoint.mockResolvedValue(undefined);

    const activity = createSaveAgentCheckpointActivity({ db: {} as never });

    await (activity as (...args: unknown[]) => Promise<unknown>)({
      sessionId: "session-1",
      checkpoint: {
        step: 6,
        state: { active: true },
        timestamp: Date.now(),
      },
      memorySnapshot: { snapshot: "data" },
      contextWindow: [{ role: "user", content: "msg" }],
    });

    expect(mockCreateCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      "session-1",
      {
        version: 6,
        state: {
          active: true,
          _memorySnapshot: { snapshot: "data" },
          _contextWindow: [{ role: "user", content: "msg" }],
        },
        stepIndex: 6,
      }
    );
  });

  it("omits _memorySnapshot when not provided", async () => {
    mockGetCheckpoints.mockResolvedValue([{ version: 1 }]);
    mockCreateCheckpoint.mockResolvedValue(undefined);

    const activity = createSaveAgentCheckpointActivity({ db: {} as never });

    await activity({
      sessionId: "session-1",
      checkpoint: { step: 2, state: { data: 1 }, timestamp: Date.now() },
    });

    const savedArg = mockCreateCheckpoint.mock.calls[0]?.[2] as
      | Record<string, unknown>
      | undefined;
    const savedState = savedArg?.state;
    expect(savedState).toEqual({ data: 1 });
    expect(savedState).not.toHaveProperty("_memorySnapshot");
    expect(savedState).not.toHaveProperty("_contextWindow");
  });
});
