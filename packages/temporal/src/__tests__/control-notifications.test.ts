import { beforeEach, describe, expect, it, vi } from "vitest";

import { createControlNotificationActivities } from "../activities/agents/control-notifications";

const mockPublishRunStarted = vi.fn();
const mockPublishRunCompleted = vi.fn();
const mockPublishAgentStatusChanged = vi.fn();
const mockAppendRunEvent = vi.fn();

vi.mock("@openbeam/services/control/realtime", () => ({
  publishRunStarted: (...args: unknown[]) => mockPublishRunStarted(...args),
  publishRunCompleted: (...args: unknown[]) => mockPublishRunCompleted(...args),
  publishAgentStatusChanged: (...args: unknown[]) =>
    mockPublishAgentStatusChanged(...args),
}));

vi.mock("@openbeam/services/control/heartbeat", () => ({
  appendRunEvent: (...args: unknown[]) => mockAppendRunEvent(...args),
}));

function createMockDb() {
  return {} as never;
}

describe("control-notifications activities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publishRunEvent", () => {
    it("dispatches run_started to publishRunStarted", async () => {
      const db = createMockDb();
      const activities = createControlNotificationActivities({ db });

      await activities.publishRunEvent({
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        type: "run_started",
      });

      expect(mockPublishRunStarted).toHaveBeenCalledWith(
        "team-1",
        "agent-1",
        "run-1"
      );
    });

    it("dispatches run_completed to publishRunCompleted", async () => {
      const db = createMockDb();
      const activities = createControlNotificationActivities({ db });

      await activities.publishRunEvent({
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        type: "run_completed",
        status: "COMPLETED",
      });

      expect(mockPublishRunCompleted).toHaveBeenCalledWith(
        "team-1",
        "agent-1",
        "run-1",
        "COMPLETED"
      );
    });

    it("dispatches status_changed to publishAgentStatusChanged", async () => {
      const db = createMockDb();
      const activities = createControlNotificationActivities({ db });

      await activities.publishRunEvent({
        teamId: "team-1",
        agentId: "agent-1",
        runId: "run-1",
        type: "status_changed",
        status: "RUNNING",
      });

      expect(mockPublishAgentStatusChanged).toHaveBeenCalledWith(
        "team-1",
        "agent-1",
        "RUNNING"
      );
    });
  });

  describe("logActivity", () => {
    it("creates run event via appendRunEvent", async () => {
      const db = createMockDb();
      const activities = createControlNotificationActivities({ db });

      await activities.logActivity({
        teamId: "team-1",
        runId: "run-1",
        agentId: "agent-1",
        seq: 1,
        eventType: "output",
        stream: "stdout",
        message: "Hello world",
      });

      expect(mockAppendRunEvent).toHaveBeenCalledWith(db, {
        teamId: "team-1",
        runId: "run-1",
        agentId: "agent-1",
        seq: 1,
        eventType: "output",
        stream: "stdout",
        message: "Hello world",
        level: undefined,
        payload: undefined,
      });
    });
  });
});
