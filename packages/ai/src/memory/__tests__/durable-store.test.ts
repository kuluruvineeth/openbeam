import { describe, expect, it } from "bun:test";
import {
  createDurableMemoryStore,
  type DurableMemoryStore,
} from "../durable-store";

describe("DurableMemoryStore (stubbed pending AgentMemory model)", () => {
  let store: DurableMemoryStore;

  store = createDurableMemoryStore({} as never);

  it("get returns null", async () => {
    const result = await store.get("session-1", "counter");
    expect(result).toBeNull();
  });

  it("set resolves without error", async () => {
    await store.set("session-1", "key", "value");
  });

  it("delete returns false", async () => {
    const result = await store.delete("session-1", "key");
    expect(result).toBe(false);
  });

  it("search returns empty array", async () => {
    const results = await store.search("session-1");
    expect(results).toEqual([]);
  });
});
