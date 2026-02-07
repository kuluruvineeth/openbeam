import { beforeEach, describe, expect, it, vi } from "vitest";

const CANVAS_NOT_FOUND_RE = /Canvas version not found/;
const CANVAS_ID_VERSION_RE = /canvas_xyz@3/;
const UNAUTHORIZED_RE = /Unauthorized/;

vi.mock("@temporalio/activity", () => ({
  ApplicationFailure: {
    nonRetryable: (message: string, type: string) => {
      const err = new Error(message);
      err.name = type;
      return err;
    },
  },
}));

import { createLoadCanvasActivity } from "../activities/canvas/load-canvas";

function createMockDb() {
  return {
    agentCanvasVersion: {
      findUnique: vi.fn(),
    },
    agentCanvas: {
      findUnique: vi.fn(),
    },
  };
}

describe("createLoadCanvasActivity", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  it("returns canvas state for valid input", async () => {
    const nodes = [{ id: "n1", type: "start" }];
    const edges = [{ id: "e1", source: "n1", target: "n2" }];
    const viewport = { x: 0, y: 0, zoom: 1 };

    mockDb.agentCanvasVersion.findUnique.mockResolvedValue({
      nodes,
      edges,
      viewport,
      agentCanvasId: "canvas_1",
    });

    mockDb.agentCanvas.findUnique.mockResolvedValue({
      teamId: "team_1",
    });

    const activity = createLoadCanvasActivity({
      db: mockDb as never,
    });

    const result = await activity({
      agentCanvasId: "canvas_1",
      versionNumber: 1,
      teamId: "team_1",
    });

    expect(result.canvas).toEqual({ nodes, edges, viewport });
  });

  it("queries with correct composite key", async () => {
    mockDb.agentCanvasVersion.findUnique.mockResolvedValue({
      nodes: [],
      edges: [],
      viewport: {},
      agentCanvasId: "canvas_abc",
    });
    mockDb.agentCanvas.findUnique.mockResolvedValue({ teamId: "team_1" });

    const activity = createLoadCanvasActivity({ db: mockDb as never });

    await activity({
      agentCanvasId: "canvas_abc",
      versionNumber: 5,
      teamId: "team_1",
    });

    expect(mockDb.agentCanvasVersion.findUnique).toHaveBeenCalledWith({
      where: {
        agentCanvasId_version: {
          agentCanvasId: "canvas_abc",
          version: 5,
        },
      },
      select: {
        nodes: true,
        edges: true,
        viewport: true,
        agentCanvasId: true,
      },
    });
  });

  it("throws CanvasNotFoundError when version not found", async () => {
    mockDb.agentCanvasVersion.findUnique.mockResolvedValue(null);

    const activity = createLoadCanvasActivity({ db: mockDb as never });

    await expect(
      activity({
        agentCanvasId: "canvas_missing",
        versionNumber: 99,
        teamId: "team_1",
      })
    ).rejects.toThrow(CANVAS_NOT_FOUND_RE);

    try {
      await activity({
        agentCanvasId: "canvas_missing",
        versionNumber: 99,
        teamId: "team_1",
      });
    } catch (error) {
      expect((error as Error).name).toBe("CanvasNotFoundError");
    }
  });

  it("includes canvas ID and version in not-found error message", async () => {
    mockDb.agentCanvasVersion.findUnique.mockResolvedValue(null);

    const activity = createLoadCanvasActivity({ db: mockDb as never });

    await expect(
      activity({
        agentCanvasId: "canvas_xyz",
        versionNumber: 3,
        teamId: "team_1",
      })
    ).rejects.toThrow(CANVAS_ID_VERSION_RE);
  });

  it("throws AuthorizationError when canvas does not belong to team", async () => {
    mockDb.agentCanvasVersion.findUnique.mockResolvedValue({
      nodes: [],
      edges: [],
      viewport: {},
      agentCanvasId: "canvas_1",
    });

    mockDb.agentCanvas.findUnique.mockResolvedValue({
      teamId: "team_other",
    });

    const activity = createLoadCanvasActivity({ db: mockDb as never });

    await expect(
      activity({
        agentCanvasId: "canvas_1",
        versionNumber: 1,
        teamId: "team_1",
      })
    ).rejects.toThrow(UNAUTHORIZED_RE);

    try {
      await activity({
        agentCanvasId: "canvas_1",
        versionNumber: 1,
        teamId: "team_1",
      });
    } catch (error) {
      expect((error as Error).name).toBe("AuthorizationError");
    }
  });

  it("throws AuthorizationError when canvas record not found", async () => {
    mockDb.agentCanvasVersion.findUnique.mockResolvedValue({
      nodes: [],
      edges: [],
      viewport: {},
      agentCanvasId: "canvas_1",
    });

    mockDb.agentCanvas.findUnique.mockResolvedValue(null);

    const activity = createLoadCanvasActivity({ db: mockDb as never });

    await expect(
      activity({
        agentCanvasId: "canvas_1",
        versionNumber: 1,
        teamId: "team_1",
      })
    ).rejects.toThrow(UNAUTHORIZED_RE);
  });

  it("does not query canvas record when version not found", async () => {
    mockDb.agentCanvasVersion.findUnique.mockResolvedValue(null);

    const activity = createLoadCanvasActivity({ db: mockDb as never });

    try {
      await activity({
        agentCanvasId: "canvas_1",
        versionNumber: 1,
        teamId: "team_1",
      });
      // biome-ignore lint/suspicious/noEmptyBlockStatements: expected throw
    } catch {}

    expect(mockDb.agentCanvas.findUnique).not.toHaveBeenCalled();
  });
});
