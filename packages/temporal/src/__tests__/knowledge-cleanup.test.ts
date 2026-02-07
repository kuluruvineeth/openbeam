import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCleanupKnowledgeChanges = vi.fn();

vi.mock("@temporalio/workflow", () => {
  const activities = {
    cleanupKnowledgeChanges: mockCleanupKnowledgeChanges,
  };

  return {
    proxyActivities: () => activities,
  };
});

describe("knowledgeCleanupWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCleanupKnowledgeChanges.mockResolvedValue({
      documentChangesDeleted: 0,
      entityChangesDeleted: 0,
      activityEventsDeleted: 0,
    });
  });

  it("delegates to cleanupKnowledgeChanges activity", async () => {
    const { knowledgeCleanupWorkflow } = await import(
      "../workflows/scheduled/knowledge-cleanup"
    );

    mockCleanupKnowledgeChanges.mockResolvedValue({
      documentChangesDeleted: 10,
      entityChangesDeleted: 5,
      activityEventsDeleted: 20,
    });

    const result = await knowledgeCleanupWorkflow({});

    expect(mockCleanupKnowledgeChanges).toHaveBeenCalledOnce();
    expect(result).toEqual({
      documentChangesDeleted: 10,
      entityChangesDeleted: 5,
      activityEventsDeleted: 20,
    });
  });

  it("passes retention day configuration to activity", async () => {
    const { knowledgeCleanupWorkflow } = await import(
      "../workflows/scheduled/knowledge-cleanup"
    );

    await knowledgeCleanupWorkflow({
      documentChangeRetentionDays: 30,
      entityChangeRetentionDays: 60,
      activityEventRetentionDays: 7,
    });

    expect(mockCleanupKnowledgeChanges).toHaveBeenCalledWith({
      documentChangeRetentionDays: 30,
      entityChangeRetentionDays: 60,
      activityEventRetentionDays: 7,
    });
  });

  it("passes undefined retention days when not specified", async () => {
    const { knowledgeCleanupWorkflow } = await import(
      "../workflows/scheduled/knowledge-cleanup"
    );

    await knowledgeCleanupWorkflow({});

    expect(mockCleanupKnowledgeChanges).toHaveBeenCalledWith({
      documentChangeRetentionDays: undefined,
      entityChangeRetentionDays: undefined,
      activityEventRetentionDays: undefined,
    });
  });

  it("works with default empty input", async () => {
    const { knowledgeCleanupWorkflow } = await import(
      "../workflows/scheduled/knowledge-cleanup"
    );

    mockCleanupKnowledgeChanges.mockResolvedValue({
      documentChangesDeleted: 100,
      entityChangesDeleted: 50,
      activityEventsDeleted: 200,
    });

    const result = await knowledgeCleanupWorkflow();

    expect(result.documentChangesDeleted).toBe(100);
    expect(result.entityChangesDeleted).toBe(50);
    expect(result.activityEventsDeleted).toBe(200);
  });

  it("returns the activity result directly", async () => {
    const { knowledgeCleanupWorkflow } = await import(
      "../workflows/scheduled/knowledge-cleanup"
    );

    const expectedResult = {
      documentChangesDeleted: 42,
      entityChangesDeleted: 17,
      activityEventsDeleted: 99,
    };
    mockCleanupKnowledgeChanges.mockResolvedValue(expectedResult);

    const result = await knowledgeCleanupWorkflow({
      documentChangeRetentionDays: 15,
    });

    expect(result).toEqual(expectedResult);
  });
});
