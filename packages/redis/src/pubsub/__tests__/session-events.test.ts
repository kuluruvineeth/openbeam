import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";

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
  publishSessionRuntimeEvent,
  createSessionRuntimeEventSubscriber,
  cleanupSessionThrottleCache,
} = await import("../session-events");

function createEvent(
  payloadType: string,
  overrides?: Partial<RuntimeEvent>
): RuntimeEvent {
  return {
    eventId: "evt-1",
    sequence: 1,
    timestamp: Date.now(),
    canvasId: "canvas-1",
    sessionId: "session-1",
    source: "system",
    visibility: "visible",
    payload: { type: payloadType } as RuntimeEvent["payload"],
    ...overrides,
  };
}

describe("publishSessionRuntimeEvent", () => {
  beforeEach(() => {
    cleanupSessionThrottleCache("s1");
    cleanupSessionThrottleCache("s2");
    mockPublish.mockClear();
  });

  it("publishes to correct channel", async () => {
    const event = createEvent("execution.started");

    await publishSessionRuntimeEvent("s1", event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const [channel, message] = mockPublish.mock.calls[0] as [string, string];
    expect(channel).toBe("session-runtime-events:s1");
    expect(JSON.parse(message)).toEqual(event);
  });

  it("throttles ephemeral events within 100ms window", async () => {
    const event = createEvent("chat.assistant_delta");

    await publishSessionRuntimeEvent("s1", event);
    await publishSessionRuntimeEvent("s1", event);
    await publishSessionRuntimeEvent("s1", event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it("never throttles terminal events", async () => {
    const neverThrottleTypes = [
      "chat.user_message",
      "chat.assistant_final",
      "tool.call_start",
      "tool.call_result",
      "canvas.op_applied",
      "canvas.op_rejected",
      "canvas.snapshot",
      "execution.started",
      "execution.completed",
      "execution.failed",
      "session.started",
      "session.resumed",
    ];

    for (const eventType of neverThrottleTypes) {
      mockPublish.mockClear();
      cleanupSessionThrottleCache("s1");

      const event = createEvent(eventType);
      await publishSessionRuntimeEvent("s1", event);
      await publishSessionRuntimeEvent("s1", event);

      expect(mockPublish).toHaveBeenCalledTimes(2);
    }
  });

  it("does not cross-throttle different event types", async () => {
    const delta = createEvent("chat.assistant_delta");
    const thinking = createEvent("chat.thinking");

    await publishSessionRuntimeEvent("s1", delta);
    await publishSessionRuntimeEvent("s1", thinking);

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("does not cross-throttle different sessions", async () => {
    const event = createEvent("chat.assistant_delta");

    await publishSessionRuntimeEvent("s1", event);
    await publishSessionRuntimeEvent("s2", event);

    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("throttles execution.progress as ephemeral", async () => {
    const event = createEvent("execution.progress");

    await publishSessionRuntimeEvent("s1", event);
    await publishSessionRuntimeEvent("s1", event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
  });
});

describe("createSessionRuntimeEventSubscriber", () => {
  beforeEach(() => {
    mockSubscribe.mockClear();
    mockConnect.mockClear();
    mockUnsubscribe.mockClear();
    mockQuit.mockClear();
    mockDuplicate.mockClear();
  });

  it("subscribes to the correct channel", async () => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: noop mock callback
    const onEvent = mock((_event: unknown) => {});

    await createSessionRuntimeEventSubscriber("s1", onEvent);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    const [channel] = mockSubscribe.mock.calls[0] as [string, unknown];
    expect(channel).toBe("session-runtime-events:s1");
  });

  it("returns a cleanup function that unsubscribes", async () => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: noop mock callback
    const onEvent = mock((_event: unknown) => {});

    const cleanup = await createSessionRuntimeEventSubscriber("s1", onEvent);
    await cleanup();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});

describe("cleanupSessionThrottleCache", () => {
  beforeEach(() => {
    cleanupSessionThrottleCache("s1");
    mockPublish.mockClear();
  });

  it("allows re-publishing after cache cleanup", async () => {
    const event = createEvent("chat.assistant_delta");

    await publishSessionRuntimeEvent("s1", event);
    expect(mockPublish).toHaveBeenCalledTimes(1);

    await publishSessionRuntimeEvent("s1", event);
    expect(mockPublish).toHaveBeenCalledTimes(1);

    cleanupSessionThrottleCache("s1");

    await publishSessionRuntimeEvent("s1", event);
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("does not affect other sessions", async () => {
    const event = createEvent("chat.assistant_delta");

    await publishSessionRuntimeEvent("s1", event);
    await publishSessionRuntimeEvent("s2", event);
    expect(mockPublish).toHaveBeenCalledTimes(2);

    cleanupSessionThrottleCache("s1");

    await publishSessionRuntimeEvent("s1", event);
    expect(mockPublish).toHaveBeenCalledTimes(3);

    await publishSessionRuntimeEvent("s2", event);
    expect(mockPublish).toHaveBeenCalledTimes(3);
  });
});
