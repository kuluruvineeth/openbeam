import { beforeEach, describe, expect, it } from "bun:test";
import type { MissionApprovalQueueItem } from "@openplane/types/mission-control";
import {
  createApprovalRequestEvent,
  createMockEvent,
} from "../../__tests__/test-helpers";
import {
  applyEventToApprovals,
  useMissionRuntimeStore,
} from "../../stores/mission-runtime-store";

beforeEach(() => {
  useMissionRuntimeStore.getState().resetAll();
});

describe("applyEventToApprovals", () => {
  it("adds approval to queue on approval.requested event", () => {
    const event = createMockEvent({
      eventType: "approval.requested",
      agentName: "Research Agent",
      payload: {
        approvalId: "appr-1",
        intent: "delete-file",
        riskLevel: "high",
      },
    });

    const result = applyEventToApprovals([], event);

    expect(result).toHaveLength(1);
    expect(result[0].approvalId).toBe("appr-1");
    expect(result[0].status).toBe("pending");
    expect(result[0].riskLevel).toBe("high");
    expect(result[0].actionIntent).toBe("delete-file");
    expect(result[0].agentName).toBe("Research Agent");
  });

  it("updates status to approved on approval.resolved with approved=true", () => {
    const existing: MissionApprovalQueueItem[] = [
      {
        approvalId: "appr-1",
        missionId: "m-1",
        runId: "r-1",
        agentName: "Agent",
        actionIntent: "action",
        riskLevel: "medium",
        status: "pending",
        requestedAt: 1000,
      },
    ];

    const event = createMockEvent({
      eventType: "approval.resolved",
      payload: { approvalId: "appr-1", approved: true },
    });

    const result = applyEventToApprovals(existing, event);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("approved");
  });

  it("updates status to rejected on approval.resolved with approved=false", () => {
    const existing: MissionApprovalQueueItem[] = [
      {
        approvalId: "appr-1",
        missionId: "m-1",
        runId: "r-1",
        agentName: "Agent",
        actionIntent: "action",
        riskLevel: "medium",
        status: "pending",
        requestedAt: 1000,
      },
    ];

    const event = createMockEvent({
      eventType: "approval.resolved",
      payload: { approvalId: "appr-1", approved: false, reason: "Too risky" },
    });

    const result = applyEventToApprovals(existing, event);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("rejected");
    expect(result[0].reason).toBe("Too risky");
  });

  it("tracks multiple approvals independently", () => {
    let queue: MissionApprovalQueueItem[] = [];

    const event1 = createMockEvent({
      eventType: "approval.requested",
      sequence: 1,
      agentName: "Agent A",
      payload: { approvalId: "appr-1", intent: "action-a", riskLevel: "low" },
    });
    const event2 = createMockEvent({
      eventType: "approval.requested",
      sequence: 2,
      agentName: "Agent B",
      payload: {
        approvalId: "appr-2",
        intent: "action-b",
        riskLevel: "critical",
      },
    });

    queue = applyEventToApprovals(queue, event1);
    queue = applyEventToApprovals(queue, event2);

    expect(queue).toHaveLength(2);
    expect(queue[0].approvalId).toBe("appr-1");
    expect(queue[0].riskLevel).toBe("low");
    expect(queue[1].approvalId).toBe("appr-2");
    expect(queue[1].riskLevel).toBe("critical");

    const resolveEvent = createMockEvent({
      eventType: "approval.resolved",
      sequence: 3,
      payload: { approvalId: "appr-1", approved: true },
    });

    queue = applyEventToApprovals(queue, resolveEvent);

    expect(queue[0].status).toBe("approved");
    expect(queue[1].status).toBe("pending");
  });

  it("does not deduplicate approval IDs on repeated requests", () => {
    let queue: MissionApprovalQueueItem[] = [];

    const event1 = createMockEvent({
      eventType: "approval.requested",
      sequence: 1,
      payload: { approvalId: "appr-dup", intent: "action", riskLevel: "low" },
    });
    const event2 = createMockEvent({
      eventType: "approval.requested",
      sequence: 2,
      payload: { approvalId: "appr-dup", intent: "action", riskLevel: "low" },
    });

    queue = applyEventToApprovals(queue, event1);
    queue = applyEventToApprovals(queue, event2);

    expect(queue).toHaveLength(2);
  });

  it("returns queue unchanged for unrelated event types", () => {
    const existing: MissionApprovalQueueItem[] = [
      {
        approvalId: "appr-1",
        missionId: "m-1",
        runId: "r-1",
        agentName: "Agent",
        actionIntent: "action",
        riskLevel: "medium",
        status: "pending",
        requestedAt: 1000,
      },
    ];

    const event = createMockEvent({
      eventType: "run.started",
      payload: { agentId: "agent-1" },
    });

    const result = applyEventToApprovals(existing, event);

    expect(result).toEqual(existing);
  });
});

describe("store approval selection", () => {
  it("toggles approval selection on and off", () => {
    const store = useMissionRuntimeStore.getState();

    store.toggleApprovalSelection("appr-1");
    expect(
      useMissionRuntimeStore.getState().selectedApprovalIds.has("appr-1")
    ).toBe(true);

    store.toggleApprovalSelection("appr-1");
    expect(
      useMissionRuntimeStore.getState().selectedApprovalIds.has("appr-1")
    ).toBe(false);
  });

  it("tracks multiple selected IDs", () => {
    const store = useMissionRuntimeStore.getState();

    store.toggleApprovalSelection("appr-1");
    store.toggleApprovalSelection("appr-2");

    const selected = useMissionRuntimeStore.getState().selectedApprovalIds;
    expect(selected.size).toBe(2);
    expect(selected.has("appr-1")).toBe(true);
    expect(selected.has("appr-2")).toBe(true);
  });

  it("clears all selections", () => {
    const store = useMissionRuntimeStore.getState();

    store.toggleApprovalSelection("appr-1");
    store.toggleApprovalSelection("appr-2");
    store.clearApprovalSelection();

    expect(useMissionRuntimeStore.getState().selectedApprovalIds.size).toBe(0);
  });

  it("selects all pending approvals", () => {
    const store = useMissionRuntimeStore.getState();

    store.ingestEvent(
      "run-1",
      createApprovalRequestEvent("appr-1", "Agent A", "low", 1)
    );
    store.ingestEvent(
      "run-1",
      createApprovalRequestEvent("appr-2", "Agent B", "high", 2)
    );
    store.ingestEvent(
      "run-1",
      createMockEvent({
        eventType: "approval.resolved",
        sequence: 3,
        payload: { approvalId: "appr-1", approved: true },
      })
    );

    store.selectAllApprovals();

    const selected = useMissionRuntimeStore.getState().selectedApprovalIds;
    expect(selected.size).toBe(1);
    expect(selected.has("appr-2")).toBe(true);
    expect(selected.has("appr-1")).toBe(false);
  });
});

describe("store ingestEvent for approvals", () => {
  it("adds pending approval via ingestEvent", () => {
    const store = useMissionRuntimeStore.getState();

    store.ingestEvent(
      "run-1",
      createApprovalRequestEvent("appr-1", "Agent A", "medium", 1)
    );

    const queue = useMissionRuntimeStore.getState().approvalQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0].approvalId).toBe("appr-1");
    expect(queue[0].status).toBe("pending");
  });

  it("skips duplicate sequence numbers", () => {
    const store = useMissionRuntimeStore.getState();

    store.ingestEvent(
      "run-1",
      createApprovalRequestEvent("appr-1", "Agent A", "low", 1)
    );
    store.ingestEvent(
      "run-1",
      createApprovalRequestEvent("appr-2", "Agent B", "high", 1)
    );

    const queue = useMissionRuntimeStore.getState().approvalQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0].approvalId).toBe("appr-1");
  });
});
