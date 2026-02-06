import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  auditToolCall,
  clearAuditBuffer,
  getAuditBuffer,
  type McpAuditEntry,
  setAuditSink,
} from "../middleware/audit";
import {
  extractAuthContext,
  isToolAllowedForContext,
  type McpAuthContext,
  requireAuth,
} from "../middleware/auth";

describe("extractAuthContext", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when no env vars set", () => {
    process.env.MCP_TEAM_ID = undefined;
    process.env.MCP_USER_ID = undefined;
    expect(extractAuthContext()).toBeNull();
  });

  it("returns null when only teamId set", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = undefined;
    expect(extractAuthContext()).toBeNull();
  });

  it("returns context with defaults when both IDs set", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    process.env.MCP_PERMISSION_MODE = undefined;
    process.env.MCP_APPROVED_TOOLS = undefined;

    const ctx = extractAuthContext();
    expect(ctx).toEqual({
      teamId: "team-1",
      userId: "user-1",
      permissionMode: "readOnly",
      approvedTools: undefined,
    });
  });

  it("reads permission mode from env", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    process.env.MCP_PERMISSION_MODE = "elevated";

    const ctx = extractAuthContext();
    expect(ctx?.permissionMode).toBe("elevated");
  });

  it("parses approved tools from comma-separated env", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    process.env.MCP_APPROVED_TOOLS = "tool_a, tool_b , tool_c";

    const ctx = extractAuthContext();
    expect(ctx?.approvedTools).toEqual(["tool_a", "tool_b", "tool_c"]);
  });
});

describe("requireAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when no auth context", () => {
    process.env.MCP_TEAM_ID = undefined;
    process.env.MCP_USER_ID = undefined;
    expect(() => requireAuth()).toThrow("MCP authentication required");
  });

  it("returns context when env vars set", () => {
    process.env.MCP_TEAM_ID = "team-1";
    process.env.MCP_USER_ID = "user-1";
    const ctx = requireAuth();
    expect(ctx.teamId).toBe("team-1");
  });
});

describe("isToolAllowedForContext", () => {
  const baseCtx: McpAuthContext = {
    teamId: "team-1",
    userId: "user-1",
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
});

describe("auditToolCall", () => {
  beforeEach(() => {
    clearAuditBuffer();
  });

  const authCtx: McpAuthContext = {
    teamId: "team-1",
    userId: "user-1",
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
    const entries: McpAuditEntry[] = [];
    setAuditSink((entry) => {
      entries.push(entry);
      return Promise.resolve();
    });

    await auditToolCall("list_connectors", undefined, authCtx, async () => ({
      content: [{ type: "text", text: "ok" }],
    }));

    expect(entries).toHaveLength(1);
    expect(entries[0]?.toolName).toBe("list_connectors");

    setAuditSink((entry) => {
      const buf = getAuditBuffer() as McpAuditEntry[];
      buf.push(entry);
      if (buf.length > 200) {
        buf.shift();
      }
      return Promise.resolve();
    });
  });
});
