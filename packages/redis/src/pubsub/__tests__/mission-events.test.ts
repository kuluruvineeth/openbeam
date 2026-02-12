import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { MissionEventPayload } from "@openplane/types/mission-control";

const mockPublish = mock(() => Promise.resolve(0));
let sequence = 0;
const mockIncr = mock(() => {
  sequence += 1;
  return Promise.resolve(sequence);
});
const mockExpire = mock(() => Promise.resolve(1));
const mockConnect = mock(() => Promise.resolve());
const mockSubscribe = mock(
  (_channel: string, _handler: (msg: string) => void) => Promise.resolve()
);
const mockUnsubscribe = mock(() => Promise.resolve());
const mockQuit = mock(() => Promise.resolve());

const mockDuplicate = mock(() => ({
  on: mock(),
  connect: mockConnect,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  quit: mockQuit,
}));

const mockRedisClient = {
  publish: mockPublish,
  incr: mockIncr,
  expire: mockExpire,
  duplicate: mockDuplicate,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const {
  publishMissionEvent,
  publishMissionTimelineEvent,
  createMissionEventEmitter,
  createMissionEventSubscriber,
  cleanupMissionThrottleCache,
} = await import("../mission-events");

function createPayload(
  overrides?: Partial<MissionEventPayload>
): MissionEventPayload {
  return {
    missionId: "m1",
    runId: "run1",
    lane: "autonomous",
    sequence: 0,
    eventType: "mission.started",
    timestamp: Date.now(),
    payload: {},
    ...overrides,
  };
}

function getPublishedCall(index: number): { channel: string; message: string } {
  const rawCall = mockPublish.mock.calls[index] as unknown[] | undefined;
  if (!rawCall || rawCall.length < 2) {
    throw new Error(`Missing publish call at index ${index}`);
  }

  const channel = rawCall[0];
  const message = rawCall[1];
  if (typeof channel !== "string" || typeof message !== "string") {
    throw new Error("Unexpected publish call payload");
  }

  return { channel, message };
}

describe("publishMissionEvent", () => {
  beforeEach(() => {
    cleanupMissionThrottleCache("m1");
    cleanupMissionThrottleCache("m2");
    mockPublish.mockClear();
    mockIncr.mockClear();
    mockExpire.mockClear();
    sequence = 0;
  });

  it("publishes an event to the correct channel", async () => {
    const payload = createPayload();

    await publishMissionEvent("m1", "run1", payload);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { channel, message } = getPublishedCall(0);
    expect(channel).toBe("mission-events:m1:run1");
    expect(JSON.parse(message)).toEqual(payload);
  });

  it("throttles non-terminal events within 250ms window", async () => {
    const payload = createPayload({ eventType: "tool.started" });

    await publishMissionEvent("m1", "run1", payload);
    await publishMissionEvent("m1", "run1", payload);
    await publishMissionEvent("m1", "run1", payload);

    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it("never throttles terminal events", async () => {
    const terminalTypes = [
      "mission.completed",
      "mission.failed",
      "mission.cancelled",
      "run.completed",
      "run.failed",
      "task.completed",
      "task.failed",
      "approval.resolved",
      "artifact.published",
    ];

    for (const eventType of terminalTypes) {
      mockPublish.mockClear();
      cleanupMissionThrottleCache("m1");

      const payload = createPayload({ eventType });
      await publishMissionEvent("m1", "run1", payload);
      await publishMissionEvent("m1", "run1", payload);

      expect(mockPublish).toHaveBeenCalledTimes(2);
    }
  });

  it("does not cross-throttle different event types", async () => {
    const p1 = createPayload({ eventType: "tool.started" });
    const p2 = createPayload({ eventType: "tool.completed" });

    await publishMissionEvent("m1", "run1", p1);
    await publishMissionEvent("m1", "run1", p2);

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("does not cross-throttle different missions", async () => {
    const payload = createPayload({ eventType: "tool.started" });

    await publishMissionEvent("m1", "run1", payload);
    await publishMissionEvent("m2", "run1", payload);

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("publishes timeline events with global sequence", async () => {
    await publishMissionTimelineEvent({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
      eventType: "run.started",
      payload: { agentId: "agent-1" },
      timestamp: 1_700_000_000_000,
    });

    await publishMissionTimelineEvent({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
      eventType: "run.completed",
      payload: { agentId: "agent-1" },
      timestamp: 1_700_000_000_100,
    });

    expect(mockIncr).toHaveBeenCalledTimes(2);
    expect(mockExpire).toHaveBeenCalledTimes(2);
    expect(mockPublish).toHaveBeenCalledTimes(2);

    const firstEvent = JSON.parse(getPublishedCall(0).message);
    const secondEvent = JSON.parse(getPublishedCall(1).message);

    expect(firstEvent.sequence).toBe(1);
    expect(secondEvent.sequence).toBe(2);
    expect(firstEvent.eventType).toBe("run.started");
    expect(secondEvent.eventType).toBe("run.completed");
  });

  it("does not throttle timeline events even with repeated non-terminal types", async () => {
    await publishMissionTimelineEvent({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
      eventType: "tool.started",
      payload: { toolName: "search" },
      timestamp: 1_700_000_000_000,
    });

    await publishMissionTimelineEvent({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
      eventType: "tool.started",
      payload: { toolName: "search" },
      timestamp: 1_700_000_000_100,
    });

    expect(mockPublish).toHaveBeenCalledTimes(2);
    const firstEvent = JSON.parse(getPublishedCall(0).message);
    const secondEvent = JSON.parse(getPublishedCall(1).message);
    expect(firstEvent.sequence).toBe(1);
    expect(secondEvent.sequence).toBe(2);
  });
});

describe("createMissionEventEmitter", () => {
  beforeEach(() => {
    cleanupMissionThrottleCache("m1");
    mockPublish.mockClear();
  });

  it("creates an emitter that publishes sequential events", async () => {
    const emitter = createMissionEventEmitter({
      missionId: "m1",
      runId: "run1",
      lane: "linear",
    });

    await emitter.missionStarted();
    await emitter.missionCompleted({ tasksCompleted: 5 });

    expect(mockPublish).toHaveBeenCalledTimes(2);

    const firstEvent = JSON.parse(getPublishedCall(0).message);
    const secondEvent = JSON.parse(getPublishedCall(1).message);

    expect(firstEvent.sequence).toBe(0);
    expect(firstEvent.eventType).toBe("mission.started");
    expect(secondEvent.sequence).toBe(1);
    expect(secondEvent.eventType).toBe("mission.completed");
  });

  it("emits run lifecycle events", async () => {
    const emitter = createMissionEventEmitter({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
    });

    await emitter.runStarted("agent1", "task1");
    await emitter.runCompleted("agent1", { artifacts: 3 });
    await emitter.runFailed("agent2", "timeout");

    expect(mockPublish).toHaveBeenCalledTimes(3);
  });

  it("emits task lifecycle events", async () => {
    const emitter = createMissionEventEmitter({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
    });

    await emitter.taskClaimed("task1", "agent1");
    await emitter.taskCompleted("task1", "agent1");
    await emitter.taskFailed("task2", "agent1", "network error");

    expect(mockPublish).toHaveBeenCalledTimes(3);
  });

  it("emits approval events", async () => {
    const emitter = createMissionEventEmitter({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
    });

    await emitter.approvalRequested("apr1", "Agent A", "delete files", "high");
    await emitter.approvalResolved("apr1", true, "user1");

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("emits budget update events", async () => {
    const emitter = createMissionEventEmitter({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
    });

    await emitter.budgetUpdated(500, 1000);

    const event = JSON.parse(getPublishedCall(0).message);
    expect(event.payload.consumedCents).toBe(500);
    expect(event.payload.budgetCents).toBe(1000);
  });

  it("emits heartbeat events", async () => {
    const emitter = createMissionEventEmitter({
      missionId: "m1",
      runId: "run1",
      lane: "autonomous",
    });

    await emitter.heartbeat();

    const event = JSON.parse(getPublishedCall(0).message);
    expect(event.eventType).toBe("heartbeat");
  });
});

describe("createMissionEventSubscriber", () => {
  beforeEach(() => {
    mockSubscribe.mockClear();
    mockConnect.mockClear();
    mockUnsubscribe.mockClear();
    mockQuit.mockClear();
    mockDuplicate.mockClear();
  });

  it("subscribes to the correct channel", async () => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: mock callback
    const onEvent = mock(() => {});

    await createMissionEventSubscriber("m1", "run1", onEvent);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    const subscribeCall = mockSubscribe.mock.calls[0];
    const channel = subscribeCall?.[0];
    expect(channel).toBe("mission-events:m1:run1");
  });

  it("returns a cleanup function that unsubscribes", async () => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: mock callback
    const onEvent = mock(() => {});

    const cleanup = await createMissionEventSubscriber("m1", "run1", onEvent);
    await cleanup();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});

describe("cleanupMissionThrottleCache", () => {
  beforeEach(() => {
    cleanupMissionThrottleCache("m1");
    mockPublish.mockClear();
  });

  it("allows re-publishing after cache cleanup", async () => {
    const payload = createPayload({ eventType: "tool.started" });

    await publishMissionEvent("m1", "run1", payload);
    expect(mockPublish).toHaveBeenCalledTimes(1);

    await publishMissionEvent("m1", "run1", payload);
    expect(mockPublish).toHaveBeenCalledTimes(1);

    cleanupMissionThrottleCache("m1");

    await publishMissionEvent("m1", "run1", payload);
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });
});
