import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  auditToolCall,
  clearAuditBuffer,
  getAuditBuffer,
  type McpAuditEntry,
  setAuditSink,
  stopAuditFlush,
} from "../middleware/audit";
import {
  isToolAllowedForContext,
  type McpAuthContext,
  resolveAuthContext,
} from "../middleware/auth";

describe("resolveAuthContext", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when no env vars set", () => {
    process.env.MCP_TEAM_ID = undefined;
    process.env.MCP_USER_ID = undefined;
    process.env.MCP_API_KEY = undefined;
    process.env.MCP_TOKEN = undefined;
    expect(() => resolveAuthContext()).toThrow("MCP authentication required");
  });

  it("throws when only teamId set", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = undefined;
    process.env.MCP_API_KEY = undefined;
    process.env.MCP_TOKEN = undefined;
    expect(() => resolveAuthContext()).toThrow("MCP authentication required");
  });

  it("returns env context with defaults when both IDs set", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    process.env.MCP_PERMISSION_MODE = undefined;
    process.env.MCP_APPROVED_TOOLS = undefined;
    process.env.MCP_API_KEY = undefined;
    process.env.MCP_TOKEN = undefined;

    const ctx = resolveAuthContext();
    expect(ctx.teamId).toBe("team-1");
    expect(ctx.userId).toBe("user-1");
    expect(ctx.source).toBe("env");
    expect(ctx.permissionMode).toBe("readOnly");
    expect(ctx.scopes).toEqual(["read"]);
    expect(ctx.rateLimitRequestsPerMinute).toBe(60);
  });

  it("reads permission mode from env", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    process.env.MCP_PERMISSION_MODE = "elevated";
    process.env.MCP_API_KEY = undefined;
    process.env.MCP_TOKEN = undefined;

    const ctx = resolveAuthContext();
    expect(ctx.permissionMode).toBe("elevated");
  });

  it("parses approved tools from comma-separated env", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    process.env.MCP_APPROVED_TOOLS = "tool_a, tool_b , tool_c";
    process.env.MCP_API_KEY = undefined;
    process.env.MCP_TOKEN = undefined;

    const ctx = resolveAuthContext();
    expect(ctx.approvedTools).toEqual(["tool_a", "tool_b", "tool_c"]);
  });

  it("prefers API key over env vars", () => {
    process.env.MCP_TEAM_ID = "team-env";
    process.env.MCP_USER_ID = "user-env";
    process.env.MCP_API_KEY = "key-123";
    process.env.MCP_API_KEY_TEAM_ID = "team-api";
    process.env.MCP_API_KEY_USER_ID = "user-api";
    process.env.MCP_TOKEN = undefined;

    const ctx = resolveAuthContext();
    expect(ctx.source).toBe("api_key");
    expect(ctx.teamId).toBe("team-api");
  });

  it("prefers token over env vars", () => {
    process.env.MCP_TEAM_ID = "team-env";
    process.env.MCP_USER_ID = "user-env";
    process.env.MCP_TOKEN = "tok-123";
    process.env.MCP_TOKEN_TEAM_ID = "team-tok";
    process.env.MCP_TOKEN_USER_ID = "user-tok";
    process.env.MCP_API_KEY = undefined;

    const ctx = resolveAuthContext();
    expect(ctx.source).toBe("token");
    expect(ctx.teamId).toBe("team-tok");
  });
});

describe("isToolAllowedForContext", () => {
  const baseCtx: McpAuthContext = {
    teamId: "team-1",
    userId: "user-1",
    scopes: ["read"],
    rateLimitRequestsPerMinute: 60,
    source: "env",
    permissionMode: "readOnly",
  };

  it("blocks write tools in readOnly mode", () => {
    expect(isToolAllowedForContext("create_connector", baseCtx)).toBe(false);
    expect(isToolAllowedForContext("update_connector", baseCtx)).toBe(false);
    expect(isToolAllowedForContext("delete_connector", baseCtx)).toBe(false);
    expect(isToolAllowedForContext("trigger_sync", baseCtx)).toBe(false);
    expect(isToolAllowedForContext("sync_connector", baseCtx)).toBe(false);
  });

  it("allows read tools in readOnly mode", () => {
    expect(isToolAllowedForContext("list_connectors", baseCtx)).toBe(true);
    expect(isToolAllowedForContext("get_connector", baseCtx)).toBe(true);
    expect(isToolAllowedForContext("get_team_summary", baseCtx)).toBe(true);
    expect(isToolAllowedForContext("get_health_score", baseCtx)).toBe(true);
  });

  it("allows all tools in elevated mode", () => {
    const elevated: McpAuthContext = { ...baseCtx, permissionMode: "elevated" };
    expect(isToolAllowedForContext("create_connector", elevated)).toBe(true);
    expect(isToolAllowedForContext("delete_connector", elevated)).toBe(true);
    expect(isToolAllowedForContext("trigger_sync", elevated)).toBe(true);
  });

  it("allows all tools in default mode", () => {
    const defaultCtx: McpAuthContext = {
      ...baseCtx,
      permissionMode: "default",
    };
    expect(isToolAllowedForContext("create_connector", defaultCtx)).toBe(true);
    expect(isToolAllowedForContext("list_connectors", defaultCtx)).toBe(true);
  });

  it("blocks unapproved tools when approvedTools is set", () => {
    const restricted: McpAuthContext = {
      ...baseCtx,
      permissionMode: "default",
      approvedTools: ["list_connectors"],
    };
    expect(isToolAllowedForContext("list_connectors", restricted)).toBe(true);
    expect(isToolAllowedForContext("get_connector", restricted)).toBe(false);
  });
});

describe("auditToolCall", () => {
  beforeEach(() => {
    clearAuditBuffer();
    stopAuditFlush();
  });

  const authCtx: McpAuthContext = {
    teamId: "team-1",
    userId: "user-1",
    scopes: ["read"],
    rateLimitRequestsPerMinute: 60,
    source: "env",
    permissionMode: "readOnly",
  };

  it("records successful tool call in buffer", async () => {
    await auditToolCall(
      "list_connectors",
      { teamId: "team-1" },
      authCtx,
      async () => ({
        content: [{ type: "text", text: "ok" }],
      })
    );

    const buffer = getAuditBuffer();
    expect(buffer).toHaveLength(1);
    const entry = buffer[0] as McpAuditEntry;
    expect(entry.toolName).toBe("list_connectors");
    expect(entry.teamId).toBe("team-1");
    expect(entry.userId).toBe("user-1");
    expect(entry.source).toBe("env");
    expect(entry.success).toBe(true);
    expect(entry.error).toBeUndefined();
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records failed tool call (isError response)", async () => {
    await auditToolCall("bad_tool", undefined, authCtx, async () => ({
      content: [{ type: "text", text: "something broke" }],
      isError: true,
    }));

    const buffer = getAuditBuffer();
    expect(buffer).toHaveLength(1);
    const entry = buffer[0] as McpAuditEntry;
    expect(entry.success).toBe(false);
    expect(entry.error).toBe("something broke");
  });

  it("records thrown errors and re-throws", async () => {
    const thrownError = new Error("kaboom");

    await expect(
      auditToolCall("exploding_tool", undefined, authCtx, () => {
        throw thrownError;
      })
    ).rejects.toThrow("kaboom");

    const buffer = getAuditBuffer();
    expect(buffer).toHaveLength(1);
    const entry = buffer[0] as McpAuditEntry;
    expect(entry.success).toBe(false);
    expect(entry.error).toBe("kaboom");
  });

  it("returns execution result on success", async () => {
    const result = await auditToolCall(
      "list_connectors",
      undefined,
      authCtx,
      async () => ({
        content: [{ type: "text", text: '{"connectors":[]}' }],
      })
    );

    expect(result.content[0]?.text).toBe('{"connectors":[]}');
    expect(result.isError).toBeUndefined();
  });

  it("respects buffer size limit", async () => {
    for (let i = 0; i < 210; i++) {
      await auditToolCall(`tool_${i}`, undefined, authCtx, async () => ({
        content: [{ type: "text", text: "ok" }],
      }));
    }

    const buffer = getAuditBuffer();
    expect(buffer.length).toBeLessThanOrEqual(200);
  });

  it("supports custom audit sink", async () => {
    const batches: McpAuditEntry[][] = [];
    setAuditSink((entries) => {
      batches.push([...entries]);
      return Promise.resolve();
    });

    for (let i = 0; i < 51; i++) {
      await auditToolCall("list_connectors", undefined, authCtx, async () => ({
        content: [{ type: "text", text: "ok" }],
      }));
    }

    expect(batches.length).toBeGreaterThanOrEqual(1);
    const totalFlushed = batches.reduce((sum, b) => sum + b.length, 0);
    expect(totalFlushed).toBeGreaterThanOrEqual(1);

    stopAuditFlush();
  });
});
