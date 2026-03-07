import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  CanvasServiceError,
  createCanvasForTeam,
  getCanvasExecutionContextForTeam,
  getCanvasForTeam,
  listCanvasForTeam,
} from "../canvas-api";

function createDatabaseStub(options?: {
  hasCanvas?: boolean;
  hasVersion?: boolean;
  canvasStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  hasTeamUser?: boolean;
}) {
  const hasCanvas = options?.hasCanvas ?? true;
  const hasVersion = options?.hasVersion ?? true;
  const canvasStatus = options?.canvasStatus ?? "PUBLISHED";
  const hasTeamUser = options?.hasTeamUser ?? true;

  const canvasRecord = hasCanvas
    ? {
        id: "canvas_1",
        name: "Canvas",
        description: null,
        icon: null,
        nodes: [],
        edges: [],
        viewport: null,
        settings: null,
        triggerType: "MANUAL",
        triggerConfig: null,
        teamId: "team_1",
        createdById: "user_1",
        status: canvasStatus,
        version: 1,
        publishedAt: null,
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        createdBy: {
          id: "user_1",
          name: "User",
          image: null,
        },
      }
    : null;

  const agentCanvas = {
    findMany: async () => [canvasRecord, canvasRecord].filter(Boolean),
    count: async () => 2,
    create: async (input: {
      data: {
        name: string;
        teamId: string;
        createdById: string;
      };
    }) => ({
      id: "canvas_2",
      status: "DRAFT",
      ...input.data,
    }),
    findFirst: async () => canvasRecord,
    update: async (input: {
      where: { id: string };
      data: { status?: string; version?: { increment: number } };
    }) => ({
      ...(canvasRecord ?? {}),
      id: input.where.id,
      status: input.data.status ?? canvasStatus,
      version:
        typeof input.data.version === "object"
          ? 2
          : (canvasRecord?.version ?? 1),
    }),
    deleteMany: async () => ({ count: hasCanvas ? 1 : 0 }),
  };

  return {
    agentCanvas,
    agentCanvasVersion: {
      findMany: async () =>
        hasVersion
          ? [
              {
                id: "version_1",
                version: 1,
                nodes: [],
                edges: [],
                viewport: null,
              },
            ]
          : [],
      create: async () => ({ id: "version_2" }),
    },
    agentCanvasExecution: {
      findMany: async () => [],
    },
    usersOnTeam: {
      findFirst: async () => (hasTeamUser ? { userId: "user_1" } : null),
    },
    $transaction: async (
      callback: (tx: {
        agentCanvas: typeof agentCanvas;
        agentCanvasVersion: {
          create: () => Promise<{ id: string }>;
        };
      }) => Promise<unknown>
    ) =>
      callback({
        agentCanvas,
        agentCanvasVersion: {
          create: async () => ({ id: "version_2" }),
        },
      }),
  } as unknown as Database;
}

describe("canvas service", () => {
  it("lists canvases with pagination", async () => {
    const db = createDatabaseStub();

    const result = await listCanvasForTeam(db, {
      teamId: "team_1",
      status: "PUBLISHED",
      limit: 1,
      offset: 0,
    });

    expect(result.items.length).toBe(1);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(1);
  });

  it("creates canvas for session actor", async () => {
    const db = createDatabaseStub();

    const created = await createCanvasForTeam(db, {
      teamId: "team_1",
      authContext: { type: "session", userId: "user_1" },
      name: "New Canvas",
      nodes: [],
      edges: [],
    });

    expect(created.id).toBe("canvas_2");
  });

  it("returns not found when canvas is missing", async () => {
    const db = createDatabaseStub({ hasCanvas: false });

    await expect(
      getCanvasForTeam(db, {
        teamId: "team_1",
        canvasId: "canvas_missing",
      })
    ).rejects.toBeInstanceOf(CanvasServiceError);
  });

  it("fails execution context when canvas is not published", async () => {
    const db = createDatabaseStub({ canvasStatus: "DRAFT" });

    await expect(
      getCanvasExecutionContextForTeam(db, {
        teamId: "team_1",
        canvasId: "canvas_1",
        authContext: { type: "session", userId: "user_1" },
      })
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("returns execution context for published canvas", async () => {
    const db = createDatabaseStub({
      canvasStatus: "PUBLISHED",
      hasVersion: true,
    });

    const context = await getCanvasExecutionContextForTeam(db, {
      teamId: "team_1",
      canvasId: "canvas_1",
      authContext: { type: "session", userId: "user_1" },
    });

    expect(context.canvasId).toBe("canvas_1");
    expect(context.versionNumber).toBe(1);
    expect(context.triggeredById).toBe("user_1");
  });
});
