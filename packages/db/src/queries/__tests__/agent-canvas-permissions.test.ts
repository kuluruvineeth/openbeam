import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  canUserExecuteCanvas,
  getCanvasPermissions,
  removeCanvasPermission,
  setCanvasPermission,
} from "../agent-canvas-permissions";

type MockFn = ReturnType<typeof mock<(...args: unknown[]) => unknown>>;

function createMockDb() {
  return {
    agentCanvas: {
      findFirst: mock(() => Promise.resolve(null)) as MockFn,
    },
    usersOnTeam: {
      findUnique: mock(() => Promise.resolve(null)) as MockFn,
    },
    agentCanvasPermission: {
      findUnique: mock(() => Promise.resolve(null)) as MockFn,
      findMany: mock(() => Promise.resolve([])) as MockFn,
      upsert: mock(() => Promise.resolve({ id: "perm-1" })) as MockFn,
      deleteMany: mock(() => Promise.resolve({ count: 1 })) as MockFn,
    },
  };
}

type MockDb = ReturnType<typeof createMockDb>;

describe("canUserExecuteCanvas", () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb();
  });

  it("returns false when canvas not found", async () => {
    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(false);
  });

  it("returns true for public canvas", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: true, createdById: "other-user" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns true for canvas creator", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "user-1" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns true for team ADMIN", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "ADMIN" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns true for team OWNER", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "OWNER" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns true for user with EXECUTOR permission", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "MEMBER" })
    ) as MockFn;
    db.agentCanvasPermission.findUnique = mock(() =>
      Promise.resolve({ role: "EXECUTOR" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns true for user with EDITOR permission", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "MEMBER" })
    ) as MockFn;
    db.agentCanvasPermission.findUnique = mock(() =>
      Promise.resolve({ role: "EDITOR" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns true for user with OWNER permission", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "MEMBER" })
    ) as MockFn;
    db.agentCanvasPermission.findUnique = mock(() =>
      Promise.resolve({ role: "OWNER" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(true);
  });

  it("returns false for user with VIEWER permission", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "MEMBER" })
    ) as MockFn;
    db.agentCanvasPermission.findUnique = mock(() =>
      Promise.resolve({ role: "VIEWER" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(false);
  });

  it("returns false when no permission record exists", async () => {
    db.agentCanvas.findFirst = mock(() =>
      Promise.resolve({ isPublic: false, createdById: "other-user" })
    ) as MockFn;
    db.usersOnTeam.findUnique = mock(() =>
      Promise.resolve({ role: "MEMBER" })
    ) as MockFn;

    const result = await canUserExecuteCanvas(
      db as never,
      "user-1",
      "canvas-1",
      "team-1"
    );
    expect(result).toBe(false);
  });
});

describe("getCanvasPermissions", () => {
  it("returns permissions with user info", async () => {
    const db = createMockDb();
    const mockPermissions = [
      {
        id: "perm-1",
        canvasId: "canvas-1",
        userId: "user-1",
        role: "EDITOR",
      },
    ];
    db.agentCanvasPermission.findMany = mock(() =>
      Promise.resolve(mockPermissions)
    ) as MockFn;

    const result = await getCanvasPermissions(db as never, "canvas-1");
    expect(result).toEqual(mockPermissions);
  });
});

describe("setCanvasPermission", () => {
  it("upserts permission record", async () => {
    const db = createMockDb();
    await setCanvasPermission(db as never, "canvas-1", "user-1", "EXECUTOR");
    expect(db.agentCanvasPermission.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("removeCanvasPermission", () => {
  it("deletes permission record", async () => {
    const db = createMockDb();
    await removeCanvasPermission(db as never, "canvas-1", "user-1");
    expect(db.agentCanvasPermission.deleteMany).toHaveBeenCalledTimes(1);
  });
});
