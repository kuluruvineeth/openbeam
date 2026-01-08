import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { defineTool, failure, success } from "../builder";
import { createChainBuilder, executeToolChain } from "../chaining";
import { toolRegistry } from "../registry";
import { createUnimplementedServices } from "../services";
import type { ToolContext } from "../types";

const mockContext: ToolContext = {
  teamId: "test-team",
  userId: "test-user",
  services: createUnimplementedServices(),
};

const addTool = defineTool({
  name: "test_add",
  description: "Add two numbers",
  category: "data",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (params) => success({ result: params.a + params.b }),
});

const multiplyTool = defineTool({
  name: "test_multiply",
  description: "Multiply two numbers",
  category: "data",
  parameters: z.object({
    value: z.number(),
    multiplier: z.number(),
  }),
  execute: async (params) =>
    success({ result: params.value * params.multiplier }),
});

const failingTool = defineTool({
  name: "test_fail",
  description: "Always fails",
  category: "data",
  parameters: z.object({}),
  execute: async () => failure("INTERNAL_ERROR", "Intentional failure"),
});

describe("executeToolChain", () => {
  beforeEach(() => {
    toolRegistry.clear();
    addTool.register();
    multiplyTool.register();
    failingTool.register();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("executes a single step chain successfully", async () => {
    const result = await executeToolChain(
      [
        {
          toolName: "test_add",
          params: { a: 2, b: 3 },
        },
      ],
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.finalOutput).toEqual({ result: 5 });
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.success).toBe(true);
    expect(result.failedAt).toBeNull();
  });

  it("chains multiple steps with output passing", async () => {
    const result = await executeToolChain(
      [
        {
          toolName: "test_add",
          params: { a: 2, b: 3 },
          transform: (r) => r.data,
        },
        {
          toolName: "test_multiply",
          params: (prev: unknown) => {
            const p = prev as { result: number };
            return {
              value: p.result,
              multiplier: 2,
            };
          },
        },
      ],
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.finalOutput).toEqual({ result: 10 });
    expect(result.steps).toHaveLength(2);
    expect(result.stepsCompleted).toBe(2);
  });

  it("stops chain on error when continueOnError is false", async () => {
    const result = await executeToolChain(
      [
        {
          toolName: "test_add",
          params: { a: 1, b: 1 },
        },
        {
          toolName: "test_fail",
          params: {},
        },
        {
          toolName: "test_multiply",
          params: { value: 1, multiplier: 2 },
        },
      ],
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe(1);
    expect(result.steps).toHaveLength(2);
    expect(result.stepsCompleted).toBe(2);
  });

  it("continues chain on error when continueOnError is true", async () => {
    const result = await executeToolChain(
      [
        {
          toolName: "test_add",
          params: { a: 1, b: 1 },
        },
        {
          toolName: "test_fail",
          params: {},
          continueOnError: true,
        },
        {
          toolName: "test_multiply",
          params: { value: 5, multiplier: 2 },
        },
      ],
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.failedAt).toBeNull();
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]?.success).toBe(true);
    expect(result.steps[1]?.success).toBe(false);
    expect(result.steps[2]?.success).toBe(true);
  });

  it("handles tool not found error", async () => {
    const result = await executeToolChain(
      [
        {
          toolName: "nonexistent_tool",
          params: {},
        },
      ],
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe(0);
    expect(result.steps[0]?.error?.code).toBe("NOT_FOUND");
  });

  it("tracks total duration", async () => {
    const result = await executeToolChain(
      [
        {
          toolName: "test_add",
          params: { a: 1, b: 2 },
        },
      ],
      mockContext
    );

    expect(result.totalDurationMs).toBeGreaterThan(0);
    expect(result.steps[0]?.durationMs).toBeGreaterThan(0);
  });
});

describe("createChainBuilder", () => {
  beforeEach(() => {
    toolRegistry.clear();
    addTool.register();
    multiplyTool.register();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("builds and executes a chain", async () => {
    const chain = createChainBuilder()
      .add({
        toolName: "test_add",
        params: { a: 5, b: 5 },
        transform: (r) => r.data,
      })
      .add({
        toolName: "test_multiply",
        params: (prev: unknown) => {
          const p = prev as { result: number };
          return {
            value: p.result,
            multiplier: 3,
          };
        },
      });

    const result = await chain.execute(mockContext);

    expect(result.success).toBe(true);
    expect(result.finalOutput).toEqual({ result: 30 });
  });

  it("returns steps via build()", () => {
    const chain = createChainBuilder()
      .add({ toolName: "test_add", params: { a: 1, b: 2 } })
      .add({ toolName: "test_multiply", params: { value: 3, multiplier: 4 } });

    const steps = chain.build();

    expect(steps).toHaveLength(2);
    expect(steps[0]?.toolName).toBe("test_add");
    expect(steps[1]?.toolName).toBe("test_multiply");
  });
});
