import { beforeEach, describe, expect, it } from "bun:test";
import { toolRegistry } from "../../../registry";
import { getToolInfoTool, listToolsTool } from "../get-tool-info";

describe("getToolInfoTool", () => {
  beforeEach(() => {
    toolRegistry.clear();
    getToolInfoTool.register();
    listToolsTool.register();
  });

  it("returns tool info for existing tool", async () => {
    const mockContext = {
      teamId: "team-1",
      userId: "user-1",
      services: {} as never,
    };

    const result = await getToolInfoTool.execute(
      { toolName: "get_tool_info" },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("get_tool_info");
    expect(result.data?.description).toBeDefined();
    expect(result.data?.category).toBe("system");
  });

  it("returns error for non-existent tool", async () => {
    const mockContext = {
      teamId: "team-1",
      userId: "user-1",
      services: {} as never,
    };

    const result = await getToolInfoTool.execute(
      { toolName: "non_existent_tool" },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_FOUND");
  });
});

describe("listToolsTool", () => {
  beforeEach(() => {
    toolRegistry.clear();
    getToolInfoTool.register();
    listToolsTool.register();
  });

  it("lists all available tools", async () => {
    const mockContext = {
      teamId: "team-1",
      userId: "user-1",
      services: {} as never,
    };

    const result = await listToolsTool.execute({}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.count).toBeGreaterThan(0);
    expect(result.data?.tools).toBeArray();
    expect(result.data?.tools[0]).toHaveProperty("name");
    expect(result.data?.tools[0]).toHaveProperty("description");
  });

  it("filters by category", async () => {
    const mockContext = {
      teamId: "team-1",
      userId: "user-1",
      services: {} as never,
    };

    const result = await listToolsTool.execute(
      { category: "system" },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(2);
  });

  it("returns empty for non-existent category", async () => {
    const mockContext = {
      teamId: "team-1",
      userId: "user-1",
      services: {} as never,
    };

    const result = await listToolsTool.execute(
      { category: "nonexistent" },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(0);
  });
});
