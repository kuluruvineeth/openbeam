import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockPublish = mock(() => Promise.resolve(0));
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
  duplicate: mockDuplicate,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const {
  publishControlEvent,
  createControlEventSubscriber,
  createControlEventEmitter,
  cleanupControlThrottleCache,
} = await import("../control-events");

type ControlEvent = Parameters<typeof publishControlEvent>[1];

function createStatusEvent(
  teamId: string,
  overrides?: Partial<ControlEvent>
): ControlEvent {
  return {
    type: "agent.status_changed",
    teamId,
    timestamp: Date.now(),
    payload: { agentId: "agent-1", status: "RUNNING" },
    ...overrides,
  } as ControlEvent;
}

function createRunOutputEvent(
  teamId: string,
  overrides?: Partial<ControlEvent>
): ControlEvent {
  return {
    type: "heartbeat.run_output",
    teamId,
    timestamp: Date.now(),
    payload: { runId: "run-1", stream: "stdout", chunk: "hello" },
    ...overrides,
  } as ControlEvent;
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

describe("publishControlEvent", () => {
  beforeEach(() => {
    cleanupControlThrottleCache("team-1");
    cleanupControlThrottleCache("team-2");
    mockPublish.mockClear();
  });

  it("publishes to correct channel", async () => {
    const event = createStatusEvent("team-1");
    await publishControlEvent("team-1", event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { channel, message } = getPublishedCall(0);
    expect(channel).toBe("control-events:team-1");
    expect(JSON.parse(message)).toEqual(event);
  });

  it("throttles ephemeral events within 250ms window", async () => {
    const event = createRunOutputEvent("team-1");

    await publishControlEvent("team-1", event);
    await publishControlEvent("team-1", event);
    await publishControlEvent("team-1", event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it("never throttles terminal events", async () => {
    const terminalTypes = [
      "agent.status_changed",
      "heartbeat.run_completed",
      "approval.status_changed",
    ] as const;

    for (const eventType of terminalTypes) {
      mockPublish.mockClear();
      cleanupControlThrottleCache("team-1");

      let payload: Record<string, string>;
      if (eventType === "agent.status_changed") {
        payload = { agentId: "a1", status: "IDLE" };
      } else if (eventType === "heartbeat.run_completed") {
        payload = { agentId: "a1", runId: "r1", status: "SUCCESS" };
      } else {
        payload = { approvalId: "ap1", status: "APPROVED", agentId: "a1" };
      }

      const event = {
        type: eventType,
        teamId: "team-1",
        timestamp: Date.now(),
        payload,
      } as ControlEvent;

      await publishControlEvent("team-1", event);
      await publishControlEvent("team-1", event);

      expect(mockPublish).toHaveBeenCalledTimes(2);
    }
  });

  it("does not cross-throttle different event types", async () => {
    const output = createRunOutputEvent("team-1");
    const activity = {
      type: "activity.created",
      teamId: "team-1",
      timestamp: Date.now(),
      payload: { entityType: "issue", entityId: "i1", action: "created" },
    } as ControlEvent;

    await publishControlEvent("team-1", output);
    await publishControlEvent("team-1", activity);

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("does not cross-throttle different teams", async () => {
    const event = createRunOutputEvent("team-1");
    const event2 = createRunOutputEvent("team-2");

    await publishControlEvent("team-1", event);
    await publishControlEvent("team-2", event2);

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("publishes approval.status_changed event", async () => {
    const event = {
      type: "approval.status_changed",
      teamId: "team-1",
      timestamp: Date.now(),
      payload: {
        approvalId: "approval-1",
        status: "APPROVED",
        agentId: "agent-1",
      },
    } as ControlEvent;

    await publishControlEvent("team-1", event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("approval.status_changed");
    expect(parsed.payload.approvalId).toBe("approval-1");
  });
});

describe("createControlEventSubscriber", () => {
  beforeEach(() => {
    mockSubscribe.mockClear();
    mockConnect.mockClear();
    mockUnsubscribe.mockClear();
    mockQuit.mockClear();
    mockDuplicate.mockClear();
  });

  it("subscribes to the correct channel", async () => {
    const noop = Function.prototype as (_event: unknown) => void;
    const onEvent = mock(noop);
    await createControlEventSubscriber("team-1", onEvent);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    const subscribeCall = mockSubscribe.mock.calls[0];
    const channel = subscribeCall?.[0];
    expect(channel).toBe("control-events:team-1");
  });

  it("returns a cleanup function that unsubscribes", async () => {
    const noop = Function.prototype as (_event: unknown) => void;
    const onEvent = mock(noop);
    const cleanup = await createControlEventSubscriber("team-1", onEvent);
    await cleanup();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});

describe("cleanupControlThrottleCache", () => {
  beforeEach(() => {
    cleanupControlThrottleCache("team-1");
    mockPublish.mockClear();
  });

  it("allows re-publishing after cache cleanup", async () => {
    const event = createRunOutputEvent("team-1");

    await publishControlEvent("team-1", event);
    expect(mockPublish).toHaveBeenCalledTimes(1);

    await publishControlEvent("team-1", event);
    expect(mockPublish).toHaveBeenCalledTimes(1);

    cleanupControlThrottleCache("team-1");

    await publishControlEvent("team-1", event);
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("does not affect other teams", async () => {
    const event1 = createRunOutputEvent("team-1");
    const event2 = createRunOutputEvent("team-2");

    await publishControlEvent("team-1", event1);
    await publishControlEvent("team-2", event2);
    expect(mockPublish).toHaveBeenCalledTimes(2);

    cleanupControlThrottleCache("team-1");

    await publishControlEvent("team-1", event1);
    expect(mockPublish).toHaveBeenCalledTimes(3);

    await publishControlEvent("team-2", event2);
    expect(mockPublish).toHaveBeenCalledTimes(3);
  });
});

describe("createControlEventEmitter", () => {
  beforeEach(() => {
    cleanupControlThrottleCache("team-1");
    mockPublish.mockClear();
  });

  it("emits agentStatusChanged", async () => {
    const emitter = createControlEventEmitter("team-1");
    await emitter.agentStatusChanged("agent-1", "RUNNING");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("agent.status_changed");
    expect(parsed.payload.agentId).toBe("agent-1");
    expect(parsed.payload.status).toBe("RUNNING");
    expect(parsed.teamId).toBe("team-1");
  });

  it("emits runStarted", async () => {
    const emitter = createControlEventEmitter("team-1");
    await emitter.runStarted("agent-1", "run-1");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("heartbeat.run_started");
    expect(parsed.payload.agentId).toBe("agent-1");
    expect(parsed.payload.runId).toBe("run-1");
  });

  it("emits runCompleted", async () => {
    const emitter = createControlEventEmitter("team-1");
    await emitter.runCompleted("agent-1", "run-1", "SUCCESS");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("heartbeat.run_completed");
    expect(parsed.payload.status).toBe("SUCCESS");
  });

  it("emits runOutput", async () => {
    const emitter = createControlEventEmitter("team-1");
    await emitter.runOutput("run-1", "stdout", "line of output");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("heartbeat.run_output");
    expect(parsed.payload.chunk).toBe("line of output");
  });

  it("emits activityCreated", async () => {
    const emitter = createControlEventEmitter("team-1");
    await emitter.activityCreated("issue", "issue-1", "created");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("activity.created");
    expect(parsed.payload.entityType).toBe("issue");
  });

  it("emits approvalStatusChanged", async () => {
    const emitter = createControlEventEmitter("team-1");
    await emitter.approvalStatusChanged("approval-1", "REJECTED", "agent-1");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const { message } = getPublishedCall(0);
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("approval.status_changed");
    expect(parsed.payload.approvalId).toBe("approval-1");
    expect(parsed.payload.status).toBe("REJECTED");
    expect(parsed.payload.agentId).toBe("agent-1");
  });
});
