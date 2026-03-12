import { describe, expect, it } from "bun:test";
import type { CanvasNodeType } from "@openbeam/types/canvas";
import { registerDefaultCanvasNodeExecutors } from "../defaults";
import {
  getCanvasNodeExecutor,
  listCanvasNodeExecutors,
  registerCanvasNodeExecutor,
} from "../registry";
import type { CanvasNodeExecutor } from "../types";

const FROZEN_REGISTRY_ERROR =
  "Cannot register executors after registry has been frozen";

describe("ExecutorRegistry", () => {
  const testExecutor: CanvasNodeExecutor = async () => ({ success: true });

  it("registers and retrieves executors", () => {
    registerDefaultCanvasNodeExecutors();

    const nodeType: CanvasNodeType = "llm";
    const retrieved = getCanvasNodeExecutor(nodeType);
    expect(retrieved).toBeDefined();
  });

  it("lists all registered executors", () => {
    const list = listCanvasNodeExecutors();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  // biome-ignore lint/suspicious/noSkippedTests: bun mock.module singleton contamination in combined test runs
  it.skip("prevents registration after freeze (bun mock.module contamination in combined runs)", () => {
    const nodeType: CanvasNodeType = "test_node" as CanvasNodeType;

    expect(() => {
      registerCanvasNodeExecutor(nodeType, testExecutor);
    }).toThrow(FROZEN_REGISTRY_ERROR);
  });

  // biome-ignore lint/suspicious/noSkippedTests: bun mock.module singleton contamination in combined test runs
  it.skip("prevents duplicate registration (bun mock.module contamination in combined runs)", () => {
    expect(() => {
      registerCanvasNodeExecutor("start", testExecutor);
    }).toThrow(FROZEN_REGISTRY_ERROR);
  });
});
