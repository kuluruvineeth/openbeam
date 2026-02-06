import { describe, expect, it, vi } from "vitest";
import {
  createLogAuditEventActivity,
  SENSITIVE_METADATA_FIELDS,
  sanitizeMetadata,
} from "../activities/canvas/audit-activity";
import type { LogAuditEventInput } from "../audit/types";

describe("sanitizeMetadata", () => {
  it("returns undefined for undefined input", () => {
    expect(sanitizeMetadata(undefined)).toBeUndefined();
  });

  it("passes through safe fields", () => {
    const metadata = { connectorId: "conn_1", syncType: "full", count: 42 };
    expect(sanitizeMetadata(metadata)).toEqual(metadata);
  });

  it("redacts top-level sensitive fields", () => {
    const metadata = {
      connectorId: "conn_1",
      accessToken: "secret_token_123",
      apiKey: "ak_secret",
    };

    const result = sanitizeMetadata(metadata);

    expect(result).toEqual({
      connectorId: "conn_1",
      accessToken: "[REDACTED]",
      apiKey: "[REDACTED]",
    });
  });

  it("redacts nested sensitive fields recursively", () => {
    const metadata = {
      connector: {
        name: "Gmail",
        auth: { accessToken: "tok", refreshToken: "ref" },
      },
    };

    const result = sanitizeMetadata(metadata) ?? {};
    const connector = result.connector as Record<string, unknown>;
    const auth = connector.auth as Record<string, unknown>;

    expect(connector.name).toBe("Gmail");
    expect(auth.accessToken).toBe("[REDACTED]");
    expect(auth.refreshToken).toBe("[REDACTED]");
  });

  it("preserves arrays without modification", () => {
    const metadata = { tags: ["sync", "full"], ids: [1, 2, 3] };
    expect(sanitizeMetadata(metadata)).toEqual(metadata);
  });

  it("redacts all known sensitive field names", () => {
    const metadata: Record<string, string> = {};
    for (const field of SENSITIVE_METADATA_FIELDS) {
      metadata[field] = `value_${field}`;
    }

    const result = sanitizeMetadata(metadata) ?? {};
    for (const field of SENSITIVE_METADATA_FIELDS) {
      expect(result[field]).toBe("[REDACTED]");
    }
  });

  it("handles deeply nested objects", () => {
    const metadata = {
      level1: {
        level2: {
          level3: { password: "deep_secret", safeField: "visible" },
        },
      },
    };

    const result = sanitizeMetadata(metadata) ?? {};
    const level3 = (
      (result.level1 as Record<string, unknown>).level2 as Record<
        string,
        unknown
      >
    ).level3 as Record<string, unknown>;

    expect(level3.password).toBe("[REDACTED]");
    expect(level3.safeField).toBe("visible");
  });

  it("handles null values in metadata", () => {
    const metadata = { connectorId: "conn_1", extra: null };
    const result = sanitizeMetadata(metadata);
    expect(result).toEqual({ connectorId: "conn_1", extra: null });
  });
});

describe("SENSITIVE_METADATA_FIELDS", () => {
  it("includes critical secret field names", () => {
    const expected = [
      "accessToken",
      "refreshToken",
      "apiKey",
      "password",
      "clientSecret",
      "webhookSecret",
      "privateKey",
      "encryptionKey",
      "signingKey",
    ];

    for (const field of expected) {
      expect(SENSITIVE_METADATA_FIELDS.has(field)).toBe(true);
    }
  });

  it("does not include non-sensitive fields", () => {
    expect(SENSITIVE_METADATA_FIELDS.has("connectorId")).toBe(false);
    expect(SENSITIVE_METADATA_FIELDS.has("name")).toBe(false);
    expect(SENSITIVE_METADATA_FIELDS.has("teamId")).toBe(false);
  });
});

describe("logAuditEvent activity", () => {
  const createMockDb = () => ({
    workflowAuditLog: {
      create: vi.fn(() => Promise.resolve({ id: "audit_123" })),
    },
  });

  it("creates audit log with all fields", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    const input: LogAuditEventInput = {
      workflowId: "workflow_123",
      runId: "run_456",
      teamId: "team_789",
      userId: "user_012",
      action: "started",
      metadata: { executionId: "exec_345", nodeCount: 5 },
    };

    await logAuditEvent(input);

    expect(mockDb.workflowAuditLog.create).toHaveBeenCalledTimes(1);
    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    const data = createCall?.[0]?.data;

    expect(data.workflowId).toBe("workflow_123");
    expect(data.runId).toBe("run_456");
    expect(data.teamId).toBe("team_789");
    expect(data.userId).toBe("user_012");
    expect(data.action).toBe("started");
    expect(data.metadata).toEqual({ executionId: "exec_345", nodeCount: 5 });
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  it("handles optional fields", async () => {
    const mockDb = createMockDb();
    const logAuditEvent = createLogAuditEventActivity({
      db: mockDb as unknown as Parameters<
        typeof createLogAuditEventActivity
      >[0]["db"],
    });

    const input: LogAuditEventInput = {
      workflowId: "workflow_123",
      teamId: "team_789",
      action: "completed",
    };

    await logAuditEvent(input);

    expect(mockDb.workflowAuditLog.create).toHaveBeenCalledTimes(1);
    const createCall = (
      mockDb.workflowAuditLog.create.mock.calls as unknown[][]
    )[0] as [{ data: Record<string, unknown> }];
    const data = createCall?.[0]?.data;

    expect(data.workflowId).toBe("workflow_123");
    expect(data.runId).toBeUndefined();
    expect(data.teamId).toBe("team_789");
    expect(data.userId).toBeUndefined();
    expect(data.action).toBe("completed");
    expect(data.metadata).toEqual({});
  });

  it("logs all action types", async () => {
    const actions = [
      "started",
      "completed",
      "failed",
      "paused",
      "resumed",
      "cancelled",
      "signaled",
    ] as const;

    for (const action of actions) {
      const mockDb = createMockDb();
      const logAuditEvent = createLogAuditEventActivity({
        db: mockDb as unknown as Parameters<
          typeof createLogAuditEventActivity
        >[0]["db"],
      });

      await logAuditEvent({
        workflowId: "workflow_123",
        teamId: "team_789",
        action,
      });

      expect(mockDb.workflowAuditLog.create).toHaveBeenCalledTimes(1);
    }
  });
});
