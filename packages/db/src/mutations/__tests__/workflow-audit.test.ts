import { describe, expect, it, mock } from "bun:test";
import {
  createWorkflowAuditLog,
  createWorkflowAuditLogs,
  deleteOldWorkflowAuditLogs,
  deleteWorkflowAuditLogsByWorkflow,
} from "../workflow-audit";

type MockCall = Record<string, unknown>;

describe("workflow audit mutations", () => {
  const createMockDb = () => ({
    workflowAuditLog: {
      create: mock((_args: MockCall) => Promise.resolve({ id: "audit_123" })),
      createMany: mock((_args: MockCall) => Promise.resolve({ count: 2 })),
      deleteMany: mock((_args: MockCall) => Promise.resolve({ count: 5 })),
    },
  });

  describe("createWorkflowAuditLog", () => {
    it("creates a single audit log", async () => {
      const mockDb = createMockDb();
      const result = await createWorkflowAuditLog(
        mockDb as unknown as Parameters<typeof createWorkflowAuditLog>[0],
        {
          workflowId: "workflow_123",
          teamId: "team_456",
          action: "started",
          metadata: { executionId: "exec_789" },
        }
      );

      expect(result.id).toBe("audit_123");
      expect(mockDb.workflowAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it("uses current timestamp when not provided", async () => {
      const mockDb = createMockDb();
      await createWorkflowAuditLog(
        mockDb as unknown as Parameters<typeof createWorkflowAuditLog>[0],
        {
          workflowId: "workflow_123",
          teamId: "team_456",
          action: "completed",
        }
      );

      const createCall = mockDb.workflowAuditLog.create.mock.calls[0];
      const data = createCall?.[0]?.data as Record<string, unknown>;
      expect(data.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("createWorkflowAuditLogs", () => {
    it("creates multiple audit logs", async () => {
      const mockDb = createMockDb();
      const result = await createWorkflowAuditLogs(
        mockDb as unknown as Parameters<typeof createWorkflowAuditLogs>[0],
        [
          { workflowId: "wf1", teamId: "team_1", action: "started" },
          { workflowId: "wf2", teamId: "team_1", action: "completed" },
        ]
      );

      expect(result.count).toBe(2);
      expect(mockDb.workflowAuditLog.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteOldWorkflowAuditLogs", () => {
    it("deletes logs older than specified date", async () => {
      const mockDb = createMockDb();
      const olderThan = new Date("2024-01-01");

      const result = await deleteOldWorkflowAuditLogs(
        mockDb as unknown as Parameters<typeof deleteOldWorkflowAuditLogs>[0],
        "team_123",
        olderThan
      );

      expect(result.count).toBe(5);
      expect(mockDb.workflowAuditLog.deleteMany).toHaveBeenCalledTimes(1);

      const deleteCall = mockDb.workflowAuditLog.deleteMany.mock.calls[0];
      const where = deleteCall?.[0]?.where as Record<string, unknown>;
      expect(where.teamId).toBe("team_123");
      expect((where.createdAt as Record<string, unknown>).lt).toEqual(
        olderThan
      );
    });
  });

  describe("deleteWorkflowAuditLogsByWorkflow", () => {
    it("deletes all logs for a workflow", async () => {
      const mockDb = createMockDb();

      const result = await deleteWorkflowAuditLogsByWorkflow(
        mockDb as unknown as Parameters<
          typeof deleteWorkflowAuditLogsByWorkflow
        >[0],
        "workflow_123"
      );

      expect(result.count).toBe(5);
      expect(mockDb.workflowAuditLog.deleteMany).toHaveBeenCalledTimes(1);

      const deleteCall = mockDb.workflowAuditLog.deleteMany.mock.calls[0];
      const where = deleteCall?.[0]?.where as Record<string, unknown>;
      expect(where.workflowId).toBe("workflow_123");
    });
  });
});
