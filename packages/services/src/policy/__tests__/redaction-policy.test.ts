import { describe, expect, it } from "bun:test";
import type { RuntimeEventPayload } from "@openbeam/types/canvas/runtime-events";
import { redactToolPayload, shouldRedactTool } from "../redaction-policy";

describe("shouldRedactTool", () => {
  it("returns true for connector_oauth_refresh", () => {
    expect(shouldRedactTool("connector_oauth_refresh")).toBe(true);
  });

  it("returns true for connector_credentials", () => {
    expect(shouldRedactTool("connector_credentials")).toBe(true);
  });

  it("returns true for api_key_rotate", () => {
    expect(shouldRedactTool("api_key_rotate")).toBe(true);
  });

  it("returns false for search_hybrid", () => {
    expect(shouldRedactTool("search_hybrid")).toBe(false);
  });

  it("returns false for canvas_add_node", () => {
    expect(shouldRedactTool("canvas_add_node")).toBe(false);
  });
});

describe("redactToolPayload", () => {
  it("passes through non-tool payloads unchanged", () => {
    const payload: RuntimeEventPayload = {
      type: "chat.assistant_delta",
      chunk: "hello",
    };
    expect(redactToolPayload(payload)).toEqual(payload);
  });

  it("passes through chat.user_message unchanged", () => {
    const payload: RuntimeEventPayload = {
      type: "chat.user_message",
      content: "search for tokens",
    };
    expect(redactToolPayload(payload)).toEqual(payload);
  });

  it("passes through execution events unchanged", () => {
    const payload: RuntimeEventPayload = {
      type: "execution.started",
      executionId: "exec_1",
      status: "RUNNING",
    };
    expect(redactToolPayload(payload)).toEqual(payload);
  });

  it("redacts entire toolInput for sensitive tool names", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_1",
      toolName: "connector_oauth_refresh",
      toolInput: { refreshToken: "secret_123", connectorId: "conn_1" },
    };

    const result = redactToolPayload(payload);

    expect(result.type).toBe("tool.call_start");
    if (result.type === "tool.call_start") {
      expect(result.toolCallId).toBe("tc_1");
      expect(result.toolName).toBe("connector_oauth_refresh");
      expect(result.redacted).toBe(true);
      expect(result.redactionKeys).toContain("refreshToken");
    }
  });

  it("redacts entire toolOutput for sensitive tool names", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_result",
      toolCallId: "tc_1",
      toolName: "connector_credentials",
      toolOutput: { accessToken: "at_123", refreshToken: "rt_456" },
      success: true,
    };

    const result = redactToolPayload(payload);

    if (result.type === "tool.call_result") {
      expect(result.toolOutput).toBe("[REDACTED]");
      expect(result.redacted).toBe(true);
      expect(result.redactionKeys).toEqual(["toolOutput"]);
    }
  });

  it("redacts sensitive fields in non-sensitive tool inputs", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_2",
      toolName: "search_hybrid",
      toolInput: {
        query: "find users",
        authorization: "Bearer secret",
        filters: { team: "t1" },
      },
    };

    const result = redactToolPayload(payload);

    if (result.type === "tool.call_start") {
      const input = result.toolInput as Record<string, unknown>;
      expect(input.query).toBe("find users");
      expect(input.authorization).toBe("[REDACTED]");
      expect(input.filters).toEqual({ team: "t1" });
      expect(result.redacted).toBe(true);
      expect(result.redactionKeys).toContain("authorization");
    }
  });

  it("redacts nested sensitive fields", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_3",
      toolName: "generic_tool",
      toolInput: {
        config: {
          apiKey: "key_123",
          endpoint: "https://api.example.com",
        },
      },
    };

    const result = redactToolPayload(payload);

    if (result.type === "tool.call_start") {
      const input = result.toolInput as Record<string, unknown>;
      const config = input.config as Record<string, unknown>;
      expect(config.apiKey).toBe("[REDACTED]");
      expect(config.endpoint).toBe("https://api.example.com");
      expect(result.redacted).toBe(true);
      expect(result.redactionKeys).toContain("apiKey");
    }
  });

  it("redacts sensitive fields in tool results", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_result",
      toolCallId: "tc_4",
      toolName: "fetch_config",
      toolOutput: {
        host: "db.example.com",
        password: "p4ssw0rd",
        cookie: "session=abc",
      },
      success: true,
    };

    const result = redactToolPayload(payload);

    if (result.type === "tool.call_result") {
      const output = result.toolOutput as Record<string, unknown>;
      expect(output.host).toBe("db.example.com");
      expect(output.password).toBe("[REDACTED]");
      expect(output.cookie).toBe("[REDACTED]");
      expect(result.redacted).toBe(true);
      expect(result.redactionKeys).toContain("password");
      expect(result.redactionKeys).toContain("cookie");
    }
  });

  it("does not mark as redacted when no sensitive fields exist", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_5",
      toolName: "search_hybrid",
      toolInput: { query: "test", limit: 10 },
    };

    const result = redactToolPayload(payload);

    if (result.type === "tool.call_start") {
      expect(result.redacted).toBeUndefined();
      expect(result.redactionKeys).toBeUndefined();
    }
  });

  it("handles undefined toolInput gracefully", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_6",
      toolName: "connector_oauth_refresh",
    };

    const result = redactToolPayload(payload);
    expect(result).toEqual(payload);
  });

  it("handles undefined toolOutput gracefully", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_result",
      toolCallId: "tc_7",
      toolName: "connector_credentials",
      success: true,
    };

    const result = redactToolPayload(payload);
    expect(result).toEqual(payload);
  });

  it("redacts sensitive keys in arrays", () => {
    const payload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_8",
      toolName: "batch_tool",
      toolInput: [
        { id: "1", secret: "s1" },
        { id: "2", token: "t2" },
      ],
    };

    const result = redactToolPayload(payload);

    if (result.type === "tool.call_start") {
      const input = result.toolInput as Record<string, unknown>[];
      expect(input).toHaveLength(2);
      expect(input).toEqual([
        { id: "1", secret: "[REDACTED]" },
        { id: "2", token: "[REDACTED]" },
      ]);
      expect(result.redacted).toBe(true);
      expect(result.redactionKeys).toContain("secret");
      expect(result.redactionKeys).toContain("token");
    }
  });

  it("handles null and primitive toolInput without error", () => {
    const nullPayload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_9",
      toolName: "search_hybrid",
      toolInput: null,
    };

    expect(redactToolPayload(nullPayload)).toEqual(nullPayload);

    const stringPayload: RuntimeEventPayload = {
      type: "tool.call_start",
      toolCallId: "tc_10",
      toolName: "search_hybrid",
      toolInput: "plain string",
    };

    expect(redactToolPayload(stringPayload)).toEqual(stringPayload);
  });
});
