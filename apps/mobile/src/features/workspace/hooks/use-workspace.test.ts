import { describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  let stateValue: unknown = null;
  return {
    ...actual,
    useState: (init: unknown) => {
      stateValue = stateValue ?? init;
      return [
        stateValue,
        (v: unknown) => {
          stateValue = v;
        },
      ];
    },
    useCallback: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import { useWorkspace } from "./use-workspace";

describe("useWorkspace", () => {
  it("returns all expected properties", () => {
    const result = useWorkspace();

    expect(result).toHaveProperty("objects");
    expect(result).toHaveProperty("isLoadingObjects");
    expect(result).toHaveProperty("selectedObject");
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("totalEntries");
    expect(result).toHaveProperty("isLoadingEntries");
    expect(result).toHaveProperty("queryResult");
    expect(result).toHaveProperty("isQuerying");
    expect(result).toHaveProperty("nl2sqlResult");
    expect(result).toHaveProperty("isGeneratingSQL");
  });

  it("returns all expected methods", () => {
    const result = useWorkspace();

    expect(typeof result.selectObject).toBe("function");
    expect(typeof result.refreshObjects).toBe("function");
    expect(typeof result.loadEntries).toBe("function");
    expect(typeof result.runQuery).toBe("function");
    expect(typeof result.askQuestion).toBe("function");
  });

  it("initializes with empty arrays and false booleans", () => {
    const result = useWorkspace();

    expect(Array.isArray(result.objects)).toBe(true);
    expect(result.isLoadingObjects).toBe(false);
    expect(result.selectedObject).toBeNull();
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.totalEntries).toBe(0);
    expect(result.isLoadingEntries).toBe(false);
    expect(result.queryResult).toBeNull();
    expect(result.isQuerying).toBe(false);
    expect(result.nl2sqlResult).toBeNull();
    expect(result.isGeneratingSQL).toBe(false);
  });
});
