import { describe, expect, it, vi } from "vitest";
import {
  createLogAuditEventActivity,
  SENSITIVE_METADATA_FIELDS,
  sanitizeMetadata,
} from "../activities/canvas/audit-activity";
import {
  LogAuditEventInputSchema,
  WorkflowAuditActionSchema,
} from "../audit/types";

describe("audit input validation", () => {
  it("accepts all valid action types", () => {
    const validActions = [
      "started",
      "completed",
      "failed",
      "paused",
      "resumed",
      "cancelled",
      "signaled",
      "checkpoint",
      "rate_limited",
      "signal_dropped",
    ];

    for (const action of validActions) {
      const result = WorkflowAuditActionSchema.safeParse(action);
      expect(result.success, `Action '${action}' should be valid`).toBe(true);
    }
  });

  it("rejects invalid action types", () => {
    const invalidActions = ["unknown", "deleted", "restarted", ""];
    for (const action of invalidActions) {
      const result = WorkflowAuditActionSchema.safeParse(action);
      expect(result.success, `Action '${action}' should be invalid`).toBe(
        false
      );
    }
  });

  it("validates complete audit event input", () => {
    const result = LogAuditEventInputSchema.safeParse({
      workflowId: "wf_123",
      runId: "run_456",
      teamId: "team_789",
      userId: "user_012",
      action: "started",
      metadata: { executionId: "exec_345" },
    });
    expect(result.success).toBe(true);
  });

  it("validates minimal audit event input", () => {
    const result = LogAuditEventInputSchema.safeParse({
      workflowId: "wf_123",
      teamId: "team_789",
      action: "completed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects input missing required fields", () => {
    const result = LogAuditEventInputSchema.safeParse({
      teamId: "team_789",
      action: "started",
    });
    expect(result.success).toBe(false);
  });

  it("rejects input with invalid action", () => {
    const result = LogAuditEventInputSchema.safeParse({
      workflowId: "wf_123",
      teamId: "team_789",
      action: "invalid_action",
    });
    expect(result.success).toBe(false);
  });
});

describe("audit metadata sanitization", () => {
  it("returns undefined for undefined metadata", () => {
    expect(sanitizeMetadata(undefined)).toBeUndefined();
  });

  it("passes through safe metadata unchanged", () => {
    const metadata = { executionId: "exec_1", nodeCount: 5, status: "ok" };
    expect(sanitizeMetadata(metadata)).toEqual(metadata);
  });

  it("redacts top-level sensitive fields", () => {
    const metadata = {
      executionId: "exec_1",
      accessToken: "secret_token_value",
      refreshToken: "refresh_secret",
    };
    const sanitized = sanitizeMetadata(metadata);
    expect(sanitized).toEqual({
      executionId: "exec_1",
      accessToken: "[REDACTED]",
      refreshToken: "[REDACTED]",
    });
  });

  it("redacts nested sensitive fields", () => {
    const metadata = {
      connector: {
        id: "conn_1",
        apiKey: "sk-12345",
        config: {
          webhookSecret: "whsec_abc",
          endpoint: "https://api.example.com",
        },
      },
    };
    const sanitized = sanitizeMetadata(metadata);
    expect(sanitized).toEqual({
      connector: {
        id: "conn_1",
        apiKey: "[REDACTED]",
        config: {
          webhookSecret: "[REDACTED]",
          endpoint: "https://api.example.com",
        },
      },
    });
  });

  it("does not modify arrays", () => {
    const metadata = { items: ["a", "b", "c"], count: 3 };
    expect(sanitizeMetadata(metadata)).toEqual(metadata);
  });

  it("handles null values in metadata", () => {
    const metadata = { executionId: "exec_1", result: null };
    expect(sanitizeMetadata(metadata)).toEqual(metadata);
  });

  it("redacts all known sensitive fields", () => {
    const metadata: Record<string, unknown> = {};
    for (const field of SENSITIVE_METADATA_FIELDS) {
      metadata[field] = `value_for_${field}`;
    }
    const sanitized = sanitizeMetadata(metadata) ?? {};
    for (const field of SENSITIVE_METADATA_FIELDS) {
      expect(sanitized[field]).toBe("[REDACTED]");
    }
  });
});

describe("audit activity with validation", () => {
  const createMockDb = () => ({
    workflowAuditLog: {
      create: vi.fn(() => Promise.resolve({ id: "audit_123" })),
    },
  });

  it("validates input before writing", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    await logAuditEvent({
      workflowId: "wf_1",
      teamId: "team_1",
      action: "checkpoint",
      metadata: { continueAsNewCount: 3 },
    });

    expect(mockDb.workflowAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("sanitizes metadata before writing", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    await logAuditEvent({
      workflowId: "wf_1",
      teamId: "team_1",
      action: "started",
      metadata: {
        executionId: "exec_1",
        apiKey: "sk-secret-key-12345",
      },
    });

    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    const data = createCall[0].data;
    const metadata = data.metadata as Record<string, unknown>;
    expect(metadata.executionId).toBe("exec_1");
    expect(metadata.apiKey).toBe("[REDACTED]");
  });

  it("logs new action types: checkpoint", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    await logAuditEvent({
      workflowId: "wf_1",
      teamId: "team_1",
      action: "checkpoint",
      metadata: {
        continueAsNewCount: 5,
        historyLength: 12_000,
      },
    });

    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    expect(createCall[0].data.action).toBe("checkpoint");
  });

  it("logs new action types: rate_limited", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    await logAuditEvent({
      workflowId: "wf_1",
      teamId: "team_1",
      action: "rate_limited",
      metadata: { limitKey: "canvas-execution", limit: 100 },
    });

    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    expect(createCall[0].data.action).toBe("rate_limited");
  });

  it("logs new action types: signal_dropped", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    await logAuditEvent({
      workflowId: "wf_1",
      teamId: "team_1",
      action: "signal_dropped",
      metadata: { reason: "parse_failure", signalType: "approval" },
    });

    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    expect(createCall[0].data.action).toBe("signal_dropped");
  });

  it("rejects invalid input at activity level", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    await expect(
      logAuditEvent({
        workflowId: "wf_1",
        teamId: "team_1",
        action: "not_a_valid_action" as "started",
      })
    ).rejects.toThrow();

    expect(mockDb.workflowAuditLog.create).not.toHaveBeenCalled();
  });
});

describe("audit logger", () => {
  it("creates audit logger with log function", async () => {
    const { createAuditLogger } = await import("../audit/logger");

    const mockDb = {
      workflowAuditLog: {
        create: vi.fn(() => Promise.resolve({ id: "audit_1" })),
      },
    };

    const logger = createAuditLogger({
      db: mockDb as unknown as Parameters<typeof createAuditLogger>[0]["db"],
    });

    await logger.log({
      timestamp: Date.now(),
      workflowId: "wf_1",
      teamId: "team_1",
      action: "started",
    });

    expect(mockDb.workflowAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("converts timestamp to Date object", async () => {
    const { logWorkflowEvent } = await import("../audit/logger");

    const mockDb = {
      workflowAuditLog: {
        create: vi.fn(() => Promise.resolve({ id: "audit_1" })),
      },
    };

    const now = Date.now();
    await logWorkflowEvent(
      mockDb as unknown as Parameters<typeof logWorkflowEvent>[0],
      {
        timestamp: now,
        workflowId: "wf_1",
        teamId: "team_1",
        action: "completed",
      }
    );

    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    expect(createCall[0].data.timestamp).toBeInstanceOf(Date);
    expect((createCall[0].data.timestamp as Date).getTime()).toBe(now);
  });

  it("defaults metadata to empty object", async () => {
    const { logWorkflowEvent } = await import("../audit/logger");

    const mockDb = {
      workflowAuditLog: {
        create: vi.fn(() => Promise.resolve({ id: "audit_1" })),
      },
    };

    await logWorkflowEvent(
      mockDb as unknown as Parameters<typeof logWorkflowEvent>[0],
      {
        timestamp: Date.now(),
        workflowId: "wf_1",
        teamId: "team_1",
        action: "failed",
      }
    );

    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    expect(createCall[0].data.metadata).toEqual({});
  });
});
