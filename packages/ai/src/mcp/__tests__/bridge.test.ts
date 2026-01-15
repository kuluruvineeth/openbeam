import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { MCPServerContext } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../tools/builder";
import { ToolRegistry } from "../../tools/registry";
import type { ToolServices } from "../../tools/services";
import {
  convertZodToJsonSchema,
  createMCPToolBridge,
  MCPToolBridge,
  mcpContextToToolContext,
  toolResultToMCPResult,
} from "../bridge";

function createTestMcpContext(
  overrides?: Partial<MCPServerContext>
): MCPServerContext {
  return {
    teamId: "team_test",
    userId: "user_test",
    sessionId: "session_test",
    ...overrides,
  };
}

function createMockServices(): ToolServices {
  return {} as ToolServices;
}

describe("MCPToolBridge", () => {
  let registry: ToolRegistry;
  let bridge: MCPToolBridge;

  beforeEach(() => {
    registry = new ToolRegistry();
    bridge = new MCPToolBridge(registry);
    registry.bindServices(createMockServices());
  });

  describe("listTools", () => {
    it("lists all registered tools", () => {
      const testTool = defineTool({
        name: "test_tool",
        description: "A test tool",
        category: "data",
        parameters: z.object({}),
        execute: async () => success({ result: "ok" }),
      });
      registry.register(testTool.metadata, testTool.coreTool);

      const tools = bridge.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe("test_tool");
    });

    it("filters by allowed callers", () => {
      const mcpAllowedTool = defineTool({
        name: "mcp_allowed",
        description: "Allowed for MCP",
        category: "data",
        parameters: z.object({}),
        allowedCallers: ["mcp", "agent"],
        execute: async () => success({ ok: true }),
      });
      registry.register(mcpAllowedTool.metadata, mcpAllowedTool.coreTool);

      const agentOnlyTool = defineTool({
        name: "agent_only",
        description: "Agent only",
        category: "data",
        parameters: z.object({}),
        allowedCallers: ["agent"],
        execute: async () => success({ ok: true }),
      });
      registry.register(agentOnlyTool.metadata, agentOnlyTool.coreTool);

      const tools = bridge.listTools("mcp");
      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe("mcp_allowed");
    });

    it("includes tools with no caller restrictions", () => {
      const unrestrictedTool = defineTool({
        name: "unrestricted",
        description: "No restrictions",
        category: "data",
        parameters: z.object({}),
        execute: async () => success({ ok: true }),
      });
      registry.register(unrestrictedTool.metadata, unrestrictedTool.coreTool);

      const tools = bridge.listTools("mcp");
      expect(tools).toHaveLength(1);
    });

    it("converts Zod schema to JSON schema", () => {
      const withSchemaTool = defineTool({
        name: "with_schema",
        description: "Tool with schema",
        category: "data",
        parameters: z.object({
          query: z.string(),
          limit: z.number().optional(),
        }),
        execute: async () => success({ ok: true }),
      });
      registry.register(withSchemaTool.metadata, withSchemaTool.coreTool);

      const tools = bridge.listTools();
      const tool = tools[0];

      expect(tool?.inputSchema).toHaveProperty("type", "object");
      expect(tool?.inputSchema).toHaveProperty("properties");
    });
  });

  describe("getToolDefinitions", () => {
    it("returns tool definitions with Zod schemas", () => {
      const testTool = defineTool({
        name: "test_tool",
        description: "Test",
        category: "data",
        parameters: z.object({ input: z.string() }),
        execute: async () => success({ ok: true }),
      });
      registry.register(testTool.metadata, testTool.coreTool);

      const definitions = bridge.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0]?.inputSchema).toBeDefined();
    });

    it("filters by allowed callers", () => {
      const restrictedTool = defineTool({
        name: "restricted",
        description: "Restricted",
        category: "data",
        parameters: z.object({}),
        allowedCallers: ["agent"],
        execute: async () => success({ ok: true }),
      });
      registry.register(restrictedTool.metadata, restrictedTool.coreTool);

      const definitions = bridge.getToolDefinitions("mcp");
      expect(definitions).toHaveLength(0);
    });
  });

  describe("hasTool", () => {
    it("returns true for registered tool", () => {
      const existingTool = defineTool({
        name: "existing",
        description: "Exists",
        category: "data",
        parameters: z.object({}),
        execute: async () => success({ ok: true }),
      });
      registry.register(existingTool.metadata, existingTool.coreTool);

      expect(bridge.hasTool("existing")).toBe(true);
    });

    it("returns false for non-existent tool", () => {
      expect(bridge.hasTool("nonexistent")).toBe(false);
    });

    it("returns false for tool not allowed for MCP", () => {
      const agentOnlyTool = defineTool({
        name: "agent_only",
        description: "Agent only",
        category: "data",
        parameters: z.object({}),
        allowedCallers: ["agent"],
        execute: async () => success({ ok: true }),
      });
      registry.register(agentOnlyTool.metadata, agentOnlyTool.coreTool);

      expect(bridge.hasTool("agent_only")).toBe(false);
    });
  });

  describe("executeTool", () => {
    it("executes tool and returns result", async () => {
      const testTool = defineTool({
        name: "test_tool",
        description: "Test",
        category: "data",
        parameters: z.object({}),
        execute: async () => success({ value: 42 }),
      });
      registry.register(testTool.metadata, testTool.coreTool);

      const result = await bridge.executeTool(
        { name: "test_tool", arguments: {} },
        createTestMcpContext()
      );

      expect(result.isError).toBe(false);
      expect(result.content[0]?.type).toBe("text");
    });

    it("returns error for non-existent tool", async () => {
      const result = await bridge.executeTool(
        { name: "nonexistent", arguments: {} },
        createTestMcpContext()
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        "not found"
      );
    });

    it("returns error for tool not allowed via MCP", async () => {
      const agentOnlyTool = defineTool({
        name: "agent_only",
        description: "Agent only",
        category: "data",
        parameters: z.object({}),
        allowedCallers: ["agent"],
        execute: async () => success({ ok: true }),
      });
      registry.register(agentOnlyTool.metadata, agentOnlyTool.coreTool);

      const result = await bridge.executeTool(
        { name: "agent_only", arguments: {} },
        createTestMcpContext()
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        "not available via MCP"
      );
    });

    it("handles tool execution errors", async () => {
      const errorTool = defineTool({
        name: "error_tool",
        description: "Errors",
        category: "data",
        parameters: z.object({}),
        execute: () => {
          throw new Error("Execution failed");
        },
      });
      registry.register(errorTool.metadata, errorTool.coreTool);

      const result = await bridge.executeTool(
        { name: "error_tool", arguments: {} },
        createTestMcpContext()
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        "Execution failed"
      );
    });

    it("notifies registry of execution", async () => {
      const notifySpy = spyOn(registry, "notifyExecute");
      const notifyTool = defineTool({
        name: "notify_tool",
        description: "Notify",
        category: "data",
        parameters: z.object({ input: z.string().optional() }),
        execute: async () => success({ result: "done" }),
      });
      registry.register(notifyTool.metadata, notifyTool.coreTool);

      await bridge.executeTool(
        { name: "notify_tool", arguments: { input: "test" } },
        createTestMcpContext()
      );

      expect(notifySpy).toHaveBeenCalledWith(
        "notify_tool",
        { input: "test" },
        expect.anything(),
        expect.any(Number)
      );
    });
  });
});

describe("convertZodToJsonSchema", () => {
  it("converts simple object schema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const jsonSchema = convertZodToJsonSchema(schema);

    expect(jsonSchema).toHaveProperty("type", "object");
    expect(jsonSchema).toHaveProperty("properties");
  });

  it("handles optional fields", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const jsonSchema = convertZodToJsonSchema(schema);
    expect(jsonSchema).toHaveProperty("type", "object");
  });

  it("handles nested objects", () => {
    const schema = z.object({
      nested: z.object({
        value: z.string(),
      }),
    });

    const jsonSchema = convertZodToJsonSchema(schema);
    expect(jsonSchema).toHaveProperty("type", "object");
  });

  it("handles arrays", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const jsonSchema = convertZodToJsonSchema(schema);
    expect(jsonSchema).toHaveProperty("type", "object");
  });
});

describe("mcpContextToToolContext", () => {
  it("converts MCP context to tool context", () => {
    const mcpContext: MCPServerContext = {
      teamId: "team_123",
      userId: "user_456",
      sessionId: "session_789",
      metadata: { custom: "value" },
    };
    const services = createMockServices();

    const toolContext = mcpContextToToolContext(mcpContext, services);

    expect(toolContext.teamId).toBe("team_123");
    expect(toolContext.userId).toBe("user_456");
    expect(toolContext.sessionId).toBe("session_789");
    expect(toolContext.metadata).toEqual({ custom: "value" });
    expect(toolContext.services).toBe(services);
  });

  it("handles missing userId", () => {
    const mcpContext: MCPServerContext = {
      teamId: "team_123",
    };
    const services = createMockServices();

    const toolContext = mcpContextToToolContext(mcpContext, services);
    expect(toolContext.userId).toBe("");
  });
});

describe("toolResultToMCPResult", () => {
  it("converts successful result to MCP format", () => {
    const result = {
      success: true,
      data: { value: 42, items: ["a", "b"] },
    };

    const mcpResult = toolResultToMCPResult(result);

    expect(mcpResult.isError).toBe(false);
    expect(mcpResult.content).toHaveLength(1);
    expect(mcpResult.content[0]?.type).toBe("text");
  });

  it("converts error result to MCP format", () => {
    const result = {
      success: false,
      error: { message: "Something failed" },
    };

    const mcpResult = toolResultToMCPResult(result);

    expect(mcpResult.isError).toBe(true);
    expect((mcpResult.content[0] as { text: string }).text).toBe(
      "Something failed"
    );
  });

  it("handles result without error message", () => {
    const result = {
      success: false,
    };

    const mcpResult = toolResultToMCPResult(result);

    expect(mcpResult.isError).toBe(true);
    expect((mcpResult.content[0] as { text: string }).text).toBe(
      "Tool execution failed"
    );
  });

  it("handles non-standard result format", () => {
    const result = { custom: "data" };

    const mcpResult = toolResultToMCPResult(result);

    expect(mcpResult.isError).toBe(false);
    expect((mcpResult.content[0] as { text: string }).text).toContain(
      '"custom": "data"'
    );
  });

  it("handles primitive results", () => {
    const mcpResult = toolResultToMCPResult("string result");

    expect(mcpResult.isError).toBe(false);
    expect((mcpResult.content[0] as { text: string }).text).toBe(
      '"string result"'
    );
  });
});

describe("createMCPToolBridge", () => {
  it("creates bridge instance", () => {
    const registry = new ToolRegistry();
    const bridge = createMCPToolBridge(registry);

    expect(bridge).toBeInstanceOf(MCPToolBridge);
  });
});
