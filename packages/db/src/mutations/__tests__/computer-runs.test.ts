import { describe, expect, it } from "bun:test";
import type { Database } from "../../index";
import {
  approveComputerRun,
  insertComputerRunSteps,
  rejectComputerRun,
} from "../computer-runs";

interface UpdateManyCall {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

interface FindFirstCall {
  where: Record<string, unknown>;
}

interface CreateManyCall {
  data: Record<string, unknown>[];
}

function createMockDb(config: {
  runToFind?: { proposedActions: unknown } | null;
  updateManyCount?: number;
  updatedRun?: Record<string, unknown> | null;
}) {
  const findFirstCalls: FindFirstCall[] = [];
  const updateManyCalls: UpdateManyCall[] = [];
  const findUniqueCalls: FindFirstCall[] = [];
  const createManyCalls: CreateManyCall[] = [];

  const db = {
    computerRun: {
      findFirst: (args: FindFirstCall) => {
        findFirstCalls.push(args);
        return Promise.resolve(config.runToFind ?? null);
      },
      findUnique: (args: FindFirstCall) => {
        findUniqueCalls.push(args);
        return Promise.resolve(config.updatedRun ?? null);
      },
      updateMany: (args: UpdateManyCall) => {
        updateManyCalls.push(args);
        return Promise.resolve({ count: config.updateManyCount ?? 0 });
      },
    },
    computerRunStep: {
      createMany: (args: CreateManyCall) => {
        createManyCalls.push(args);
        return Promise.resolve({ count: args.data.length });
      },
    },
  } as unknown as Database;

  return {
    db,
    findFirstCalls,
    updateManyCalls,
    findUniqueCalls,
    createManyCalls,
  };
}

describe("approveComputerRun", () => {
  it("returns null when run is not in WAITING_APPROVAL state", async () => {
    const { db } = createMockDb({ runToFind: null });
    const result = await approveComputerRun(db, "run_1", "team_a");
    expect(result).toBeNull();
  });

  it("scopes findFirst by runId, teamId, and WAITING_APPROVAL status", async () => {
    const { db, findFirstCalls } = createMockDb({
      runToFind: { proposedActions: [] },
      updateManyCount: 1,
      updatedRun: { id: "run_1", status: "PENDING", agentId: "agent_1" },
    });

    await approveComputerRun(db, "run_1", "team_a");

    expect(findFirstCalls).toHaveLength(1);
    expect(findFirstCalls[0]?.where).toEqual({
      id: "run_1",
      teamId: "team_a",
      status: "WAITING_APPROVAL",
    });
  });

  it("uses atomic updateMany with CAS on WAITING_APPROVAL to prevent race", async () => {
    const { db, updateManyCalls } = createMockDb({
      runToFind: { proposedActions: [{ tool: "x", args: {} }] },
      updateManyCount: 1,
      updatedRun: { id: "run_1" },
    });

    await approveComputerRun(db, "run_1", "team_a");

    expect(updateManyCalls).toHaveLength(1);
    expect(updateManyCalls[0]?.where).toMatchObject({
      id: "run_1",
      teamId: "team_a",
      status: "WAITING_APPROVAL",
    });
    expect(updateManyCalls[0]?.data).toMatchObject({ status: "PENDING" });
  });

  it("returns null when CAS update matches zero rows (concurrent reject)", async () => {
    const { db } = createMockDb({
      runToFind: { proposedActions: [] },
      updateManyCount: 0,
    });

    const result = await approveComputerRun(db, "run_1", "team_a");
    expect(result).toBeNull();
  });

  it("filters approved actions by provided indices", async () => {
    const actions = [
      { tool: "a", args: {} },
      { tool: "b", args: {} },
      { tool: "c", args: {} },
    ];
    const { db, updateManyCalls } = createMockDb({
      runToFind: { proposedActions: actions },
      updateManyCount: 1,
      updatedRun: { id: "run_1" },
    });

    await approveComputerRun(db, "run_1", "team_a", [0, 2]);

    const approved = updateManyCalls[0]?.data.proposedActions as {
      tool: string;
    }[];
    expect(approved).toHaveLength(2);
    expect(approved[0]?.tool).toBe("a");
    expect(approved[1]?.tool).toBe("c");
  });

  it("approves all actions when no indices provided", async () => {
    const actions = [
      { tool: "a", args: {} },
      { tool: "b", args: {} },
    ];
    const { db, updateManyCalls } = createMockDb({
      runToFind: { proposedActions: actions },
      updateManyCount: 1,
      updatedRun: { id: "run_1" },
    });

    await approveComputerRun(db, "run_1", "team_a");

    const approved = updateManyCalls[0]?.data.proposedActions as unknown[];
    expect(approved).toHaveLength(2);
  });

  it("ignores out-of-range indices", async () => {
    const actions = [{ tool: "a", args: {} }];
    const { db, updateManyCalls } = createMockDb({
      runToFind: { proposedActions: actions },
      updateManyCount: 1,
      updatedRun: { id: "run_1" },
    });

    await approveComputerRun(db, "run_1", "team_a", [0, 5, -1, 99]);

    const approved = updateManyCalls[0]?.data.proposedActions as unknown[];
    expect(approved).toHaveLength(1);
  });
});

describe("rejectComputerRun", () => {
  it("returns true when a WAITING_APPROVAL run is rejected", async () => {
    const { db } = createMockDb({ updateManyCount: 1 });
    const result = await rejectComputerRun(db, "run_1", "team_a");
    expect(result).toBe(true);
  });

  it("returns false when no WAITING_APPROVAL run matches", async () => {
    const { db } = createMockDb({ updateManyCount: 0 });
    const result = await rejectComputerRun(db, "run_1", "team_a");
    expect(result).toBe(false);
  });

  it("scopes updateMany by teamId and WAITING_APPROVAL status", async () => {
    const { db, updateManyCalls } = createMockDb({ updateManyCount: 1 });
    await rejectComputerRun(db, "run_1", "team_a");

    expect(updateManyCalls[0]?.where).toMatchObject({
      id: "run_1",
      teamId: "team_a",
      status: "WAITING_APPROVAL",
    });
  });

  it("sets status to FAILED with error marker and completedAt", async () => {
    const { db, updateManyCalls } = createMockDb({ updateManyCount: 1 });
    await rejectComputerRun(db, "run_1", "team_a");

    const data = updateManyCalls[0]?.data;
    expect(data?.status).toBe("FAILED");
    expect(data?.error).toBe("rejected_by_user");
    expect(data?.completedAt).toBeInstanceOf(Date);
  });

  it("cannot reject a COMPLETED run (status guard)", async () => {
    const { db, updateManyCalls } = createMockDb({ updateManyCount: 0 });
    const result = await rejectComputerRun(db, "run_1", "team_a");

    expect(result).toBe(false);
    expect(updateManyCalls[0]?.where.status).toBe("WAITING_APPROVAL");
  });
});

describe("insertComputerRunSteps", () => {
  it("is a no-op for empty step array", async () => {
    const { db, createManyCalls } = createMockDb({});
    await insertComputerRunSteps(db, "run_1", []);
    expect(createManyCalls).toHaveLength(0);
  });

  it("assigns sequence starting at 0 by default", async () => {
    const { db, createManyCalls } = createMockDb({});
    await insertComputerRunSteps(db, "run_1", [
      {
        type: "tool_call",
        name: "search",
        input: {},
        output: {},
        durationMs: 100,
      },
      {
        type: "ai_generation",
        name: "generate",
        input: {},
        output: {},
        durationMs: 200,
      },
    ]);

    const inserted = createManyCalls[0]?.data ?? [];
    expect(inserted).toHaveLength(2);
    expect(inserted[0]?.sequence).toBe(0);
    expect(inserted[1]?.sequence).toBe(1);
  });

  it("applies sequenceOffset for multi-batch inserts", async () => {
    const { db, createManyCalls } = createMockDb({});
    await insertComputerRunSteps(
      db,
      "run_1",
      [
        {
          type: "tool_call",
          name: "x",
          input: {},
          output: {},
          durationMs: 50,
        },
      ],
      10
    );

    expect(createManyCalls[0]?.data[0]?.sequence).toBe(10);
  });

  it("uppercases snake_case step types to match Prisma enum", async () => {
    const { db, createManyCalls } = createMockDb({});
    await insertComputerRunSteps(db, "run_1", [
      {
        type: "tool_call",
        name: "x",
        input: {},
        output: {},
        durationMs: 0,
      },
      {
        type: "ai_generation",
        name: "y",
        input: {},
        output: {},
        durationMs: 0,
      },
    ]);

    const inserted = createManyCalls[0]?.data ?? [];
    expect(inserted[0]?.type).toBe("TOOL_CALL");
    expect(inserted[1]?.type).toBe("AI_GENERATION");
  });

  it("preserves runId and durationMs on every step", async () => {
    const { db, createManyCalls } = createMockDb({});
    await insertComputerRunSteps(db, "run_abc", [
      {
        type: "tool_call",
        name: "n",
        input: { q: "test" },
        output: { count: 5 },
        durationMs: 123,
      },
    ]);

    const step = createManyCalls[0]?.data[0];
    expect(step?.runId).toBe("run_abc");
    expect(step?.durationMs).toBe(123);
  });
});
