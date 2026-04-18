import { describe, expect, it } from "bun:test";
import type { Database } from "../../index";
import { deleteAgentMemory, upsertAgentMemory } from "../computer-memory";

interface DeleteManyCall {
  where: Record<string, unknown>;
}

interface UpsertCall {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

function createMockDb() {
  const deleteManyCalls: DeleteManyCall[] = [];
  const upsertCalls: UpsertCall[] = [];

  const db = {
    computerAgentMemory: {
      deleteMany: (args: DeleteManyCall) => {
        deleteManyCalls.push(args);
        return Promise.resolve({ count: 1 });
      },
      upsert: (args: UpsertCall) => {
        upsertCalls.push(args);
        return Promise.resolve({
          ...args.create,
          id: "mem_1",
          updatedAt: new Date(),
        });
      },
    },
  } as unknown as Database;

  return { db, deleteManyCalls, upsertCalls };
}

describe("deleteAgentMemory", () => {
  it("requires teamId to prevent cross-team deletion", async () => {
    const { db, deleteManyCalls } = createMockDb();
    await deleteAgentMemory(db, "agent_1", "team_a", "my_key");

    expect(deleteManyCalls[0]?.where).toEqual({
      agentId: "agent_1",
      teamId: "team_a",
      key: "my_key",
    });
  });

  it("scopes by all three keys (agentId + teamId + key) for safe deletion", async () => {
    const { db, deleteManyCalls } = createMockDb();
    await deleteAgentMemory(db, "agent_1", "team_a", "key1");
    await deleteAgentMemory(db, "agent_1", "team_b", "key1");

    expect(deleteManyCalls).toHaveLength(2);
    expect(deleteManyCalls[0]?.where.teamId).toBe("team_a");
    expect(deleteManyCalls[1]?.where.teamId).toBe("team_b");
  });
});

describe("upsertAgentMemory", () => {
  it("uses composite key (agentId, key) for upsert lookup", async () => {
    const { db, upsertCalls } = createMockDb();
    await upsertAgentMemory(db, {
      agentId: "agent_1",
      teamId: "team_a",
      key: "weekly_volume",
      content: "{}",
    });

    expect(upsertCalls[0]?.where).toEqual({
      agentId_key: { agentId: "agent_1", key: "weekly_volume" },
    });
  });

  it("coerces undefined type to null on create", async () => {
    const { db, upsertCalls } = createMockDb();
    await upsertAgentMemory(db, {
      agentId: "agent_1",
      teamId: "team_a",
      key: "k",
      content: "v",
    });

    expect(upsertCalls[0]?.create.type).toBeNull();
    expect(upsertCalls[0]?.update.type).toBeNull();
  });

  it("preserves provided type on create and update", async () => {
    const { db, upsertCalls } = createMockDb();
    await upsertAgentMemory(db, {
      agentId: "agent_1",
      teamId: "team_a",
      key: "k",
      content: "v",
      type: "snapshot",
    });

    expect(upsertCalls[0]?.create.type).toBe("snapshot");
    expect(upsertCalls[0]?.update.type).toBe("snapshot");
  });

  it("includes teamId on create but not update (immutable after creation)", async () => {
    const { db, upsertCalls } = createMockDb();
    await upsertAgentMemory(db, {
      agentId: "agent_1",
      teamId: "team_a",
      key: "k",
      content: "v",
    });

    expect(upsertCalls[0]?.create.teamId).toBe("team_a");
    expect(upsertCalls[0]?.update.teamId).toBeUndefined();
  });
});
