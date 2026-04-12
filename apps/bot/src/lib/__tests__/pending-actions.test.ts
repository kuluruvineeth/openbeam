import { describe, expect, mock, test } from "bun:test";

const store = new Map<string, { value: string; ttl?: number }>();

mock.module("@openbeam/redis", () => ({
  getRedisClient: () =>
    Promise.resolve({
      get: (key: string) => Promise.resolve(store.get(key)?.value ?? null),
      set: (key: string, value: string, opts?: { EX?: number }) => {
        store.set(key, { value, ttl: opts?.EX });
        return Promise.resolve("OK");
      },
      del: (key: string) => {
        store.delete(key);
        return Promise.resolve(1);
      },
    }),
}));

import {
  getPendingAction,
  resolvePendingAction,
  storePendingAction,
} from "../pending-actions";

const BASE_ACTION = {
  connectorId: "conn_1",
  actionId: "issue_create",
  params: { title: "Bug" },
  teamId: "t1",
  userId: "u1",
  description: "Create issue",
  stakes: "medium",
};

describe("pending actions", () => {
  test("storePendingAction returns unique pendingId", async () => {
    store.clear();
    const id1 = await storePendingAction("SLACK", "u1", BASE_ACTION);
    const id2 = await storePendingAction("SLACK", "u1", BASE_ACTION);
    expect(id1).toHaveLength(8);
    expect(id2).toHaveLength(8);
    expect(id1).not.toBe(id2);
  });

  test("getPendingAction returns stored action", async () => {
    store.clear();
    const id = await storePendingAction("SLACK", "u1", BASE_ACTION);
    const action = await getPendingAction("SLACK", "u1", id);
    expect(action).not.toBeNull();
    expect(action?.actionId).toBe("issue_create");
    expect(action?.pendingId).toBe(id);
  });

  test("resolvePendingAction returns and deletes", async () => {
    store.clear();
    const id = await storePendingAction("SLACK", "u1", BASE_ACTION);
    const action = await resolvePendingAction("SLACK", "u1", id);
    expect(action).not.toBeNull();
    expect(action?.actionId).toBe("issue_create");

    const again = await getPendingAction("SLACK", "u1", id);
    expect(again).toBeNull();
  });

  test("returns null for nonexistent action", async () => {
    store.clear();
    const action = await resolvePendingAction("SLACK", "u1", "nonexist");
    expect(action).toBeNull();
  });

  test("stores with TTL", async () => {
    store.clear();
    const id = await storePendingAction("SLACK", "u1", BASE_ACTION);
    const key = `pending_action:SLACK:u1:${id}`;
    expect(store.get(key)?.ttl).toBe(300);
  });
});
