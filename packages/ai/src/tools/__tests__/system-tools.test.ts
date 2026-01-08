import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { defineTool, success } from "../builder";
import { getToolInfoTool, listToolsTool } from "../definitions/system";
import { toolRegistry } from "../registry";
import { createUnimplementedServices } from "../services";
import type { ToolContext } from "../types";

const mockContext: ToolContext = {
  teamId: "test-team",
  userId: "test-user",
  services: createUnimplementedServices(),
};

const mockTool = defineTool({
  name: "test_mock",
  description: "A test tool for unit testing",
  category: "data",
  parameters: z.object({
    input: z.string().describe("Test input"),
    count: z.number().optional().describe("Test count"),
  }),
  execute: async () => success({ result: "ok" }),
});

describe("getToolInfoTool", () => {
  beforeEach(() => {
    toolRegistry.clear();
    mockTool.register();
    getToolInfoTool.register();
    listToolsTool.register();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("returns tool info for existing tool", async () => {
    const result = await getToolInfoTool.execute(
      { toolName: "test_mock" },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("test_mock");
    expect(result.data?.description).toBe("A test tool for unit testing");
    expect(result.data?.category).toBe("data");
  });

  it("returns error for non-existent tool", async () => {
    const result = await getToolInfoTool.execute(
      { toolName: "nonexistent" },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_FOUND");
  });
});

describe("listToolsTool", () => {
  beforeEach(() => {
    toolRegistry.clear();
    mockTool.register();
    getToolInfoTool.register();
    listToolsTool.register();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("lists all registered tools", async () => {
    const result = await listToolsTool.execute({}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.count).toBeGreaterThanOrEqual(3);
    expect(
      result.data?.tools.some((t: { name: string }) => t.name === "test_mock")
    ).toBe(true);
  });

  it("filters by category", async () => {
    const result = await listToolsTool.execute(
      { category: "data" },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(
      result.data?.tools.every((t: { name: string }) => {
        const meta = toolRegistry.getMetadata(t.name);
        return meta?.category === "data";
      })
    ).toBe(true);
  });
});

describe("ToolRegistry.getToolNamesForPrompt", () => {
  beforeEach(() => {
    toolRegistry.clear();
    mockTool.register();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("returns tool names", () => {
    const names = toolRegistry.getToolNamesForPrompt();

    expect(names).toContain("test_mock");
  });

  it("excludes deferred tools", () => {
    const deferredTool = defineTool({
      name: "test_deferred",
      description: "A deferred tool",
      category: "data",
      deferLoading: true,
      parameters: z.object({}),
      execute: async () => success({}),
    });
    deferredTool.register();

    const names = toolRegistry.getToolNamesForPrompt();

    expect(names).not.toContain("test_deferred");
  });
});

describe("ToolRegistry.getToolNamesWithDescriptions", () => {
  beforeEach(() => {
    toolRegistry.clear();
    mockTool.register();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("returns tool names with descriptions", () => {
    const tools = toolRegistry.getToolNamesWithDescriptions();

    const mockToolInfo = tools.find((t) => t.name === "test_mock");
    expect(mockToolInfo).toBeDefined();
    expect(mockToolInfo?.description).toBe("A test tool for unit testing");
  });
});
