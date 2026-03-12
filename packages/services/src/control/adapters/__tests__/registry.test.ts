import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearAdapters,
  getAdapter,
  getAdapterConfigurationDoc,
  getAdapterOrThrow,
  listAdapterModels,
  listAdapterTypes,
  registerAdapter,
} from "../registry";
import type { ServerAdapterModule } from "../types";

function createMockAdapter(type: string): ServerAdapterModule {
  return {
    type,
    execute: async () => ({ exitCode: 0, signal: null, timedOut: false }),
  };
}

beforeEach(() => {
  clearAdapters();
});

describe("registerAdapter / getAdapter", () => {
  it("registers and retrieves an adapter", () => {
    const adapter = createMockAdapter("TEST_A");
    registerAdapter(adapter);
    expect(getAdapter("TEST_A")).toBe(adapter);
  });

  it("returns null for unregistered type", () => {
    expect(getAdapter("NONEXISTENT_TYPE")).toBeNull();
  });
});

describe("getAdapterOrThrow", () => {
  it("returns adapter when registered", () => {
    const adapter = createMockAdapter("TEST_B");
    registerAdapter(adapter);
    expect(getAdapterOrThrow("TEST_B")).toBe(adapter);
  });

  it("throws for unknown type", () => {
    expect(() => getAdapterOrThrow("UNKNOWN_TYPE")).toThrow(
      "Unknown adapter type: UNKNOWN_TYPE"
    );
  });
});

describe("listAdapterTypes", () => {
  it("includes registered types", () => {
    registerAdapter(createMockAdapter("TEST_C"));
    const types = listAdapterTypes();
    expect(types).toContain("TEST_C");
  });
});

describe("listAdapterModels", () => {
  it("returns empty array for unknown type", () => {
    expect(listAdapterModels("NONE")).toEqual([]);
  });

  it("returns static models when defined", () => {
    const adapter = createMockAdapter("TEST_D");
    adapter.models = [{ id: "m1", name: "Model 1" }];
    registerAdapter(adapter);
    expect(listAdapterModels("TEST_D")).toEqual([
      { id: "m1", name: "Model 1" },
    ]);
  });

  it("calls listModels when defined", async () => {
    const adapter = createMockAdapter("TEST_E");
    adapter.listModels = async () => [{ id: "m2", name: "Model 2" }];
    registerAdapter(adapter);
    const models = await listAdapterModels("TEST_E");
    expect(models).toEqual([{ id: "m2", name: "Model 2" }]);
  });
});

describe("getAdapterConfigurationDoc", () => {
  it("returns null for unknown type", () => {
    expect(getAdapterConfigurationDoc("NONE")).toBeNull();
  });

  it("returns doc when defined", () => {
    const adapter = createMockAdapter("TEST_F");
    adapter.agentConfigurationDoc = "# Config Guide";
    registerAdapter(adapter);
    expect(getAdapterConfigurationDoc("TEST_F")).toBe("# Config Guide");
  });
});
