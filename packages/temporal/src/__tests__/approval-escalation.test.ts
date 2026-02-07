import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateApprovalEscalation = vi.fn();
const mockExpireApproval = vi.fn();

vi.mock("@openplane/db", () => ({
  updateApprovalEscalation: mockUpdateApprovalEscalation,
  expireApproval: mockExpireApproval,
}));

let createSendApprovalReminderActivity: typeof import("../activities/canvas/escalation").createSendApprovalReminderActivity;
let createEscalateApprovalActivity: typeof import("../activities/canvas/escalation").createEscalateApprovalActivity;
let createExpireApprovalActivity: typeof import("../activities/canvas/escalation").createExpireApprovalActivity;

const mockApprovalFindUnique = vi.fn();

const mockDb = {
  agentCanvasApproval: {
    findUnique: mockApprovalFindUnique,
  },
} as never;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("../activities/canvas/escalation");
  createSendApprovalReminderActivity = mod.createSendApprovalReminderActivity;
  createEscalateApprovalActivity = mod.createEscalateApprovalActivity;
  createExpireApprovalActivity = mod.createExpireApprovalActivity;
});

describe("sendApprovalReminder", () => {
  it("sends reminder for pending approval", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "PENDING",
      reminderSentAt: null,
    });
    mockUpdateApprovalEscalation.mockResolvedValue({});

    const activity = createSendApprovalReminderActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
    });

    expect(result.reminded).toBe(true);
    expect(mockUpdateApprovalEscalation).toHaveBeenCalledWith(
      mockDb,
      "appr-1",
      expect.objectContaining({ reminderSentAt: expect.any(Date) })
    );
  });

  it("skips reminder if already sent", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "PENDING",
      reminderSentAt: new Date(),
    });

    const activity = createSendApprovalReminderActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
    });

    expect(result.reminded).toBe(false);
    expect(mockUpdateApprovalEscalation).not.toHaveBeenCalled();
  });

  it("skips reminder if approval is not pending", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "APPROVED",
      reminderSentAt: null,
    });

    const activity = createSendApprovalReminderActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
    });

    expect(result.reminded).toBe(false);
  });

  it("throws if approval not found", async () => {
    mockApprovalFindUnique.mockResolvedValue(null);

    const activity = createSendApprovalReminderActivity({ db: mockDb });

    await expect(
      activity({
        approvalId: "appr-missing",
        executionId: "exec-1",
        nodeId: "node-1",
      })
    ).rejects.toThrow("Approval not found");
  });
});

describe("escalateApproval", () => {
  it("escalates pending approval to target user", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "PENDING",
      escalatedAt: null,
    });
    mockUpdateApprovalEscalation.mockResolvedValue({});

    const activity = createEscalateApprovalActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
      escalateToUserId: "admin-1",
    });

    expect(result.escalated).toBe(true);
    expect(mockUpdateApprovalEscalation).toHaveBeenCalledWith(
      mockDb,
      "appr-1",
      expect.objectContaining({
        escalatedTo: "admin-1",
        escalatedAt: expect.any(Date),
      })
    );
  });

  it("skips escalation if already escalated", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "PENDING",
      escalatedAt: new Date(),
    });

    const activity = createEscalateApprovalActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
      escalateToUserId: "admin-1",
    });

    expect(result.escalated).toBe(false);
    expect(mockUpdateApprovalEscalation).not.toHaveBeenCalled();
  });

  it("skips escalation if approval resolved", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "REJECTED",
      escalatedAt: null,
    });

    const activity = createEscalateApprovalActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
      escalateToUserId: "admin-1",
    });

    expect(result.escalated).toBe(false);
  });
});

describe("expireApproval", () => {
  it("expires pending approval", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "PENDING",
    });
    mockExpireApproval.mockResolvedValue({});

    const activity = createExpireApprovalActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
    });

    expect(result.expired).toBe(true);
    expect(mockExpireApproval).toHaveBeenCalledWith(mockDb, "appr-1");
  });

  it("skips expiry if already resolved", async () => {
    mockApprovalFindUnique.mockResolvedValue({
      status: "APPROVED",
    });

    const activity = createExpireApprovalActivity({ db: mockDb });
    const result = await activity({
      approvalId: "appr-1",
      executionId: "exec-1",
      nodeId: "node-1",
    });

    expect(result.expired).toBe(false);
    expect(mockExpireApproval).not.toHaveBeenCalled();
  });

  it("throws if approval not found", async () => {
    mockApprovalFindUnique.mockResolvedValue(null);

    const activity = createExpireApprovalActivity({ db: mockDb });

    await expect(
      activity({
        approvalId: "appr-missing",
        executionId: "exec-1",
        nodeId: "node-1",
      })
    ).rejects.toThrow("Approval not found");
  });
});
