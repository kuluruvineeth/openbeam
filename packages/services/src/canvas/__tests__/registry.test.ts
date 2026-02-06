import { describe, expect, it } from "bun:test";
import type { CanvasNodeType } from "@openplane/types/canvas";
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

  it("prevents registration after freeze", () => {
    const nodeType: CanvasNodeType = "test_node" as CanvasNodeType;

    expect(() => {
      registerCanvasNodeExecutor(nodeType, testExecutor);
    }).toThrow(FROZEN_REGISTRY_ERROR);
  });

  it("prevents duplicate registration", () => {
    expect(() => {
      registerCanvasNodeExecutor("start", testExecutor);
    }).toThrow(FROZEN_REGISTRY_ERROR);
  });
});
