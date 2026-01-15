import { beforeEach, describe, expect, it, mock } from "bun:test";
import type {
  InitializeParams,
  MCPCapabilities,
  MCPServerContext,
} from "@openplane/types/ai";
import { ToolRegistry } from "../../tools/registry";
import {
  createMCPServer,
  createNotification,
  createRequest,
  isValidNotification,
  isValidRequest,
  MCPServer,
  parseMessage,
} from "../server";
import { MCP_ERROR_CODES } from "../types";

function createTestContext(
  overrides?: Partial<MCPServerContext>
): MCPServerContext {
  return {
    teamId: "team_test",
    userId: "user_test",
    sessionId: "session_test",
    ...overrides,
  };
}

function createInitializeParams(
  overrides?: Partial<InitializeParams>
): InitializeParams {
  return {
    protocolVersion: "2024-11-05",
    capabilities: { tools: true, resources: true, prompts: true },
    clientInfo: { name: "test-client", version: "1.0.0" },
    ...overrides,
  };
}

describe("MCPServer", () => {
  let server: MCPServer;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
    server = new MCPServer(toolRegistry, {
      name: "test-server",
      version: "1.0.0",
    });
  });

  describe("initialization", () => {
    it("initializes with client info", async () => {
      const request = createRequest("initialize", createInitializeParams());
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      expect(response.result).toMatchObject({
        protocolVersion: "2024-11-05",
        serverInfo: { name: "test-server", version: "1.0.0" },
      });
    });

    it("stores client info after initialization", async () => {
      expect(server.getClientInfo()).toBeUndefined();

      const request = createRequest("initialize", createInitializeParams());
      await server.handleRequest(request, createTestContext());

      expect(server.getClientInfo()).toEqual({
        name: "test-client",
        version: "1.0.0",
      });
    });

    it("rejects double initialization", async () => {
      const request = createRequest("initialize", createInitializeParams());
      await server.handleRequest(request, createTestContext());

      const response = await server.handleRequest(request, createTestContext());
      expect(response.error?.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
      expect(response.error?.message).toContain("already initialized");
    });

    it("negotiates capabilities", async () => {
      const request = createRequest(
        "initialize",
        createInitializeParams({
          capabilities: { tools: true, resources: false, prompts: true },
        })
      );

      const response = await server.handleRequest(request, createTestContext());
      const caps = (response.result as { capabilities: MCPCapabilities })
        .capabilities;

      expect(caps.tools).toBe(true);
      expect(caps.resources).toBe(false);
      expect(caps.prompts).toBe(true);
    });

    it("sets initialized state", async () => {
      expect(server.isInitialized()).toBe(false);

      const request = createRequest("initialize", createInitializeParams());
      await server.handleRequest(request, createTestContext());

      expect(server.isInitialized()).toBe(true);
    });
  });

  describe("ping", () => {
    it("responds to ping", async () => {
      const request = createRequest("ping");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      expect(response.result).toEqual({ pong: true });
    });
  });

  describe("initialized notification", () => {
    it("handles initialized notification", async () => {
      const request = createRequest("initialized");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      expect(response.result).toEqual({});
    });
  });

  describe("tools", () => {
    beforeEach(async () => {
      const initRequest = createRequest("initialize", createInitializeParams());
      await server.handleRequest(initRequest, createTestContext());
    });

    it("lists tools", async () => {
      const request = createRequest("tools/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty("tools");
    });

    it("returns error for non-existent tool", async () => {
      const request = createRequest("tools/call", {
        name: "non_existent_tool",
        arguments: {},
      });

      const response = await server.handleRequest(request, createTestContext());
      expect(response.error?.code).toBe(MCP_ERROR_CODES.TOOL_NOT_FOUND);
    });
  });

  describe("resources", () => {
    beforeEach(async () => {
      const initRequest = createRequest("initialize", createInitializeParams());
      await server.handleRequest(initRequest, createTestContext());
    });

    it("lists resources", async () => {
      const registry = server.getResourceRegistry();
      registry.register(
        { uri: "test://resource", name: "Test", description: "Test resource" },
        async () => ({ contents: [] })
      );

      const request = createRequest("resources/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      const result = response.result as { resources: unknown[] };
      expect(result.resources).toHaveLength(1);
    });

    it("lists resource templates", async () => {
      const registry = server.getResourceRegistry();
      registry.registerTemplate(
        {
          uriTemplate: "test://items/{id}",
          name: "Item",
          description: "Item template",
        },
        async () => ({ contents: [] })
      );

      const request = createRequest("resources/templates/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      const result = response.result as { resourceTemplates: unknown[] };
      expect(result.resourceTemplates).toHaveLength(1);
    });

    it("reads existing resource", async () => {
      const registry = server.getResourceRegistry();
      registry.register(
        { uri: "test://resource", name: "Test", description: "Test resource" },
        async () => ({
          contents: [
            { type: "resource", uri: "test://resource", text: "data" },
          ],
        })
      );

      const request = createRequest("resources/read", {
        uri: "test://resource",
      });
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      const result = response.result as { contents: unknown[] };
      expect(result.contents).toHaveLength(1);
    });

    it("returns error for non-existent resource", async () => {
      const request = createRequest("resources/read", {
        uri: "test://nonexistent",
      });
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.RESOURCE_NOT_FOUND);
    });
  });

  describe("prompts", () => {
    beforeEach(async () => {
      const initRequest = createRequest("initialize", createInitializeParams());
      await server.handleRequest(initRequest, createTestContext());
    });

    it("lists prompts", async () => {
      const registry = server.getPromptRegistry();
      registry.register(
        { name: "test-prompt", description: "Test prompt" },
        async () => ({ messages: [] })
      );

      const request = createRequest("prompts/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      const result = response.result as { prompts: unknown[] };
      expect(result.prompts).toHaveLength(1);
    });

    it("gets existing prompt", async () => {
      const registry = server.getPromptRegistry();
      registry.register(
        { name: "test-prompt", description: "Test prompt" },
        async () => ({
          messages: [{ role: "user", content: { type: "text", text: "Test" } }],
        })
      );

      const request = createRequest("prompts/get", { name: "test-prompt" });
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      const result = response.result as { messages: unknown[] };
      expect(result.messages).toHaveLength(1);
    });

    it("returns error for non-existent prompt", async () => {
      const request = createRequest("prompts/get", { name: "nonexistent" });
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.PROMPT_NOT_FOUND);
    });
  });

  describe("capability enforcement", () => {
    it("rejects resource requests when capability disabled", async () => {
      const initRequest = createRequest(
        "initialize",
        createInitializeParams({
          capabilities: { tools: true, resources: false, prompts: true },
        })
      );
      await server.handleRequest(initRequest, createTestContext());

      const request = createRequest("resources/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
      expect(response.error?.message).toContain("not enabled");
    });

    it("rejects prompt requests when capability disabled", async () => {
      const initRequest = createRequest(
        "initialize",
        createInitializeParams({
          capabilities: { tools: true, resources: true, prompts: false },
        })
      );
      await server.handleRequest(initRequest, createTestContext());

      const request = createRequest("prompts/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
    });
  });

  describe("pre-initialization enforcement", () => {
    it("rejects resource requests before initialization", async () => {
      const request = createRequest("resources/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
      expect(response.error?.message).toContain("not initialized");
    });

    it("rejects prompt requests before initialization", async () => {
      const request = createRequest("prompts/list");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
    });

    it("allows ping before initialization", async () => {
      const request = createRequest("ping");
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error).toBeUndefined();
      expect(response.result).toEqual({ pong: true });
    });
  });

  describe("unknown method handling", () => {
    it("returns method not found for unknown methods", async () => {
      const request = createRequest("unknown/method" as never);
      const response = await server.handleRequest(request, createTestContext());

      expect(response.error?.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
    });
  });

  describe("notification handling", () => {
    it("handles registered notifications", () => {
      const handler = mock();
      server.onNotification("test/event", handler);

      server.handleNotification(
        createNotification("test/event", { data: "test" }),
        createTestContext()
      );

      expect(handler).toHaveBeenCalledWith({ data: "test" });
    });

    it("ignores unregistered notifications", () => {
      server.handleNotification(
        createNotification("unknown/event", { data: "test" }),
        createTestContext()
      );
    });

    it("supports unsubscribing from notifications", () => {
      const handler = mock();
      const unsubscribe = server.onNotification("test/event", handler);

      unsubscribe();

      server.handleNotification(
        createNotification("test/event", { data: "test" }),
        createTestContext()
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("resets server state", async () => {
      const initRequest = createRequest("initialize", createInitializeParams());
      await server.handleRequest(initRequest, createTestContext());

      expect(server.isInitialized()).toBe(true);

      server.reset();

      expect(server.isInitialized()).toBe(false);
      expect(server.getClientInfo()).toBeUndefined();
    });

    it("allows re-initialization after reset", async () => {
      const initRequest = createRequest("initialize", createInitializeParams());
      await server.handleRequest(initRequest, createTestContext());

      server.reset();

      const response = await server.handleRequest(
        initRequest,
        createTestContext()
      );
      expect(response.error).toBeUndefined();
    });
  });

  describe("getNegotiatedCapabilities", () => {
    it("returns negotiated capabilities", async () => {
      const initRequest = createRequest(
        "initialize",
        createInitializeParams({
          capabilities: { tools: true, resources: false, prompts: true },
        })
      );
      await server.handleRequest(initRequest, createTestContext());

      const caps = server.getNegotiatedCapabilities();
      expect(caps.tools).toBe(true);
      expect(caps.resources).toBe(false);
      expect(caps.prompts).toBe(true);
    });

    it("returns copy to prevent mutation", async () => {
      const initRequest = createRequest("initialize", createInitializeParams());
      await server.handleRequest(initRequest, createTestContext());

      const caps1 = server.getNegotiatedCapabilities();
      const caps2 = server.getNegotiatedCapabilities();

      expect(caps1).not.toBe(caps2);
      expect(caps1).toEqual(caps2);
    });
  });

  describe("getToolBridge", () => {
    it("returns tool bridge", () => {
      const bridge = server.getToolBridge();
      expect(bridge).toBeDefined();
    });
  });
});

describe("createMCPServer", () => {
  it("creates server with options", () => {
    const toolRegistry = new ToolRegistry();
    const server = createMCPServer(toolRegistry, {
      name: "my-server",
      version: "2.0.0",
    });

    expect(server).toBeInstanceOf(MCPServer);
  });

  it("supports optional capabilities", () => {
    const toolRegistry = new ToolRegistry();
    const server = createMCPServer(toolRegistry, {
      name: "my-server",
      version: "1.0.0",
      capabilities: { logging: true, sampling: true },
    });

    expect(server).toBeDefined();
  });
});

describe("createRequest", () => {
  it("creates request with method and params", () => {
    const request = createRequest("tools/list", { filter: "test" });

    expect(request.jsonrpc).toBe("2.0");
    expect(request.method).toBe("tools/list");
    expect(request.params).toEqual({ filter: "test" });
    expect(request.id).toBeDefined();
  });

  it("generates unique IDs", () => {
    const request1 = createRequest("ping");
    const request2 = createRequest("ping");

    expect(request1.id).not.toBe(request2.id);
  });

  it("accepts custom ID", () => {
    const request = createRequest("ping", undefined, "custom-id-123");

    expect(request.id).toBe("custom-id-123");
  });

  it("accepts numeric ID", () => {
    const request = createRequest("ping", undefined, 42);

    expect(request.id).toBe(42);
  });
});

describe("createNotification", () => {
  it("creates notification without ID", () => {
    const notification = createNotification("event/occurred", { data: "test" });

    expect(notification.jsonrpc).toBe("2.0");
    expect(notification.method).toBe("event/occurred");
    expect(notification.params).toEqual({ data: "test" });
    expect("id" in notification).toBe(false);
  });

  it("creates notification without params", () => {
    const notification = createNotification("heartbeat");

    expect(notification.method).toBe("heartbeat");
    expect(notification.params).toBeUndefined();
  });
});

describe("isValidRequest", () => {
  it("returns true for valid request", () => {
    const request = {
      jsonrpc: "2.0",
      id: "123",
      method: "tools/list",
    };

    expect(isValidRequest(request)).toBe(true);
  });

  it("returns true for request with numeric ID", () => {
    const request = {
      jsonrpc: "2.0",
      id: 42,
      method: "tools/list",
    };

    expect(isValidRequest(request)).toBe(true);
  });

  it("returns false for missing jsonrpc", () => {
    const request = {
      id: "123",
      method: "tools/list",
    };

    expect(isValidRequest(request)).toBe(false);
  });

  it("returns false for wrong jsonrpc version", () => {
    const request = {
      jsonrpc: "1.0",
      id: "123",
      method: "tools/list",
    };

    expect(isValidRequest(request)).toBe(false);
  });

  it("returns false for missing ID", () => {
    const request = {
      jsonrpc: "2.0",
      method: "tools/list",
    };

    expect(isValidRequest(request)).toBe(false);
  });

  it("returns false for missing method", () => {
    const request = {
      jsonrpc: "2.0",
      id: "123",
    };

    expect(isValidRequest(request)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isValidRequest(null)).toBe(false);
    expect(isValidRequest("string")).toBe(false);
    expect(isValidRequest(42)).toBe(false);
  });
});

describe("isValidNotification", () => {
  it("returns true for valid notification", () => {
    const notification = {
      jsonrpc: "2.0",
      method: "event/occurred",
    };

    expect(isValidNotification(notification)).toBe(true);
  });

  it("returns true for notification with params", () => {
    const notification = {
      jsonrpc: "2.0",
      method: "event/occurred",
      params: { data: "test" },
    };

    expect(isValidNotification(notification)).toBe(true);
  });

  it("returns false if has ID (makes it a request)", () => {
    const notification = {
      jsonrpc: "2.0",
      id: "123",
      method: "event/occurred",
    };

    expect(isValidNotification(notification)).toBe(false);
  });

  it("returns false for missing method", () => {
    const notification = {
      jsonrpc: "2.0",
    };

    expect(isValidNotification(notification)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isValidNotification(null)).toBe(false);
    expect(isValidNotification(undefined)).toBe(false);
  });
});

describe("parseMessage", () => {
  it("parses valid request", () => {
    const json = JSON.stringify({
      jsonrpc: "2.0",
      id: "123",
      method: "tools/list",
    });

    const result = parseMessage(json);
    expect(result).not.toBeNull();
    expect(isValidRequest(result)).toBe(true);
  });

  it("parses valid notification", () => {
    const json = JSON.stringify({
      jsonrpc: "2.0",
      method: "event/occurred",
    });

    const result = parseMessage(json);
    expect(result).not.toBeNull();
    expect(isValidNotification(result)).toBe(true);
  });

  it("returns null for invalid JSON", () => {
    const result = parseMessage("not valid json");
    expect(result).toBeNull();
  });

  it("returns null for invalid message structure", () => {
    const json = JSON.stringify({ foo: "bar" });
    const result = parseMessage(json);
    expect(result).toBeNull();
  });

  it("returns null for empty JSON", () => {
    const result = parseMessage("{}");
    expect(result).toBeNull();
  });
});

describe("error handling", () => {
  let server: MCPServer;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
    server = new MCPServer(toolRegistry, {
      name: "test-server",
      version: "1.0.0",
    });
  });

  it("classifies thrown errors correctly", async () => {
    const registry = server.getResourceRegistry();
    registry.register(
      { uri: "test://error", name: "Error", description: "Throws error" },
      () => {
        throw new Error("Something went wrong");
      }
    );

    const initRequest = createRequest("initialize", createInitializeParams());
    await server.handleRequest(initRequest, createTestContext());

    const request = createRequest("resources/read", { uri: "test://error" });
    const response = await server.handleRequest(request, createTestContext());

    expect(response.error?.code).toBe(MCP_ERROR_CODES.INTERNAL_ERROR);
    expect(response.error?.message).toBe("Something went wrong");
  });

  it("handles non-Error throws", async () => {
    const registry = server.getResourceRegistry();
    registry.register(
      { uri: "test://error", name: "Error", description: "Throws string" },
      () => {
        // biome-ignore lint/style/useThrowOnlyError: intentionally testing non-Error throw handling
        throw "string error";
      }
    );

    const initRequest = createRequest("initialize", createInitializeParams());
    await server.handleRequest(initRequest, createTestContext());

    const request = createRequest("resources/read", { uri: "test://error" });
    const response = await server.handleRequest(request, createTestContext());

    expect(response.error?.code).toBe(MCP_ERROR_CODES.INTERNAL_ERROR);
    expect(response.error?.message).toBe("Unknown error");
  });
});
