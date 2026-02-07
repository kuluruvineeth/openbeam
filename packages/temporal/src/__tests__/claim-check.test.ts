import type { ExecutionDataRef } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  type ClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../engine/claim-check";

function createMemoryStore(): ClaimCheckStore {
  const data = new Map<string, unknown>();
  let counter = 0;

  return {
    put(payload, metadata) {
      counter += 1;
      const id = `data_${counter}`;
      data.set(id, payload);

      const ref: ExecutionDataRef = {
        id,
        storage: "db",
        sizeBytes: metadata?.sizeBytes,
        contentType: metadata?.contentType,
      };

      return Promise.resolve(ref);
    },
    get(ref) {
      return Promise.resolve(data.get(ref.id));
    },
  };
}

describe("claim check", () => {
  it("stores small payloads inline", async () => {
    const store = createMemoryStore();
    const value = { ok: true, count: 1 };

    const stored = await storePayload(value, store, { maxInlineBytes: 1024 });
    expect(isExecutionDataRef(stored)).toBe(false);

    const resolved = await resolvePayload(stored, store);
    expect(resolved).toEqual(value);
  });

  it("stores large payloads by reference", async () => {
    const store = createMemoryStore();
    const value = "x".repeat(2048);

    const stored = await storePayload(value, store, { maxInlineBytes: 32 });
    expect(isExecutionDataRef(stored)).toBe(true);

    const resolved = await resolvePayload(stored, store);
    expect(resolved).toBe(value);
  });
});
