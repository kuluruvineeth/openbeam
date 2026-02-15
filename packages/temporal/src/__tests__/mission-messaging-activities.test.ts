import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";
import { beforeEach, describe, expect, it, vi } from "vitest";

const UUID_PATTERN = /[a-z0-9-]+/i;

const mockPublishAgentMessage = vi.fn();
const mockGetAgentMessageHistory = vi.fn();
const mockLPush = vi.fn();
const mockLTrim = vi.fn();
const mockExpire = vi.fn();
const mockSignal = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("@openplane/redis", () => ({
  publishAgentMessage: (...args: unknown[]) => mockPublishAgentMessage(...args),
  getAgentMessageHistory: (...args: unknown[]) =>
    mockGetAgentMessageHistory(...args),
  getRedisClient: vi.fn().mockResolvedValue({
    lPush: (...args: unknown[]) => mockLPush(...args),
    lTrim: (...args: unknown[]) => mockLTrim(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  }),
}));

vi.mock("../client", () => ({
  getTemporalClient: vi.fn().mockResolvedValue({
    workflow: {
      getHandle: vi.fn().mockReturnValue({
        signal: (...args: unknown[]) => mockSignal(...args),
      }),
    },
  }),
}));

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: vi.fn(),
    }),
  },
}));

import { createMissionActivities } from "../activities/mission/index";
import {
  fetchAgentInbox,
  routeAgentMessage,
  waitForAgentReply,
} from "../activities/mission/messaging";
import { agentMessageRouteSignal } from "../workflows/types";

function createEnvelope(
  overrides?: Omit<Partial<AgentMessageEnvelope>, "message"> & {
    message?: Partial<AgentMessageEnvelope["message"]>;
  }
): AgentMessageEnvelope {
  const messageOverrides = overrides?.message ?? {};
  const { message: _message, ...envelopeOverrides } = overrides ?? {};

  return {
    message: {
      id: "msg-1",
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      kind: "direct",
      priority: "normal",
      subject: "subject",
      body: { ok: true },
      createdAt: 100,
      ...messageOverrides,
    },
    ...envelopeOverrides,
  };
}

describe("routeAgentMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublishAgentMessage.mockResolvedValue("1700000000000-1");
    mockLPush.mockResolvedValue(1);
    mockLTrim.mockResolvedValue("OK");
    mockExpire.mockResolvedValue(1);
    mockSignal.mockResolvedValue(undefined);
    mockRedisSet.mockResolvedValue("OK");
  });

  it("deduplicates retries when requestId is provided", async () => {
    mockRedisSet.mockResolvedValue(null);

    const result = await routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      subject: "status",
      body: "hello",
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
      requestId: "req-123",
    });

    expect(result.delivered).toBe(true);
    expect(result.messageId).toBe("req-123");
    expect(mockPublishAgentMessage).not.toHaveBeenCalled();
    expect(mockSignal).not.toHaveBeenCalled();
  });

  it("processes message normally when requestId is new", async () => {
    mockRedisSet.mockResolvedValue("OK");

    const result = await routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      subject: "status",
      body: "hello",
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
      requestId: "req-new",
    });

    expect(result.delivered).toBe(true);
    expect(mockPublishAgentMessage).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "msg-dedup:mission-1:req-new",
      "1",
      { NX: true, EX: 3600 }
    );
  });

  it("skips dedup when no requestId is provided", async () => {
    const result = await routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      subject: "status",
      body: "hello",
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
    });

    expect(result.delivered).toBe(true);
    expect(mockRedisSet).not.toHaveBeenCalled();
    expect(mockPublishAgentMessage).toHaveBeenCalledTimes(1);
  });

  it("routes a message and signals orchestrator", async () => {
    const result = await routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      senderName: "Agent A",
      recipientId: "agent-b",
      subject: "status",
      body: { progress: 50 },
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
    });

    expect(result.messageId).toMatch(UUID_PATTERN);
    expect(result.delivered).toBe(true);
    expect(mockPublishAgentMessage).toHaveBeenCalledTimes(1);
    expect(mockSignal).toHaveBeenCalledWith(
      agentMessageRouteSignal,
      expect.objectContaining({
        envelope: expect.objectContaining({
          message: expect.objectContaining({
            missionId: "mission-1",
            senderId: "agent-a",
            recipientId: "agent-b",
            subject: "status",
          }),
        }),
      })
    );
  });

  it("returns delivered false when orchestrator signal fails", async () => {
    mockSignal.mockRejectedValue(new Error("signal failed"));

    const result = await routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      subject: "status",
      body: { progress: 50 },
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
    });

    expect(result.delivered).toBe(false);
  });
});

describe("routeAgentMessage (wrapped via createMissionActivities)", () => {
  const mockPublishTimelineEvent = vi.fn();

  let wrappedActivities: ReturnType<typeof createMissionActivities>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPublishAgentMessage.mockResolvedValue("1700000000000-1");
    mockLPush.mockResolvedValue(1);
    mockLTrim.mockResolvedValue("OK");
    mockExpire.mockResolvedValue(1);
    mockSignal.mockResolvedValue(undefined);
    mockPublishTimelineEvent.mockResolvedValue(undefined);

    wrappedActivities = createMissionActivities({
      db: {} as never,
      publishTimelineEvent: mockPublishTimelineEvent,
    });
  });

  it("publishes agent_message_sent timeline event after routing", async () => {
    const result = await wrappedActivities.routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      senderName: "Agent A",
      recipientId: "agent-b",
      subject: "status update",
      body: { progress: 50 },
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
    });

    expect(result.messageId).toMatch(UUID_PATTERN);
    expect(mockPublishTimelineEvent).toHaveBeenCalledTimes(1);
    expect(mockPublishTimelineEvent).toHaveBeenCalledWith({
      missionId: "mission-1",
      eventType: "agent_message_sent",
      payload: {
        messageId: result.messageId,
        fromAgentId: "agent-a",
        fromAgentName: "Agent A",
        toAgentId: "agent-b",
        channel: "direct",
        preview: "status update",
        content: JSON.stringify({ progress: 50 }),
        replyToMessageId: undefined,
      },
    });
  });

  it("uses senderId as fromAgentName when senderName is absent", async () => {
    await wrappedActivities.routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      subject: "ping",
      body: "hello",
      kind: "direct",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
    });

    expect(mockPublishTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          fromAgentName: "agent-a",
          content: "hello",
        }),
      })
    );
  });

  it("sets channel to broadcast for broadcast messages", async () => {
    await wrappedActivities.routeAgentMessage({
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "__broadcast__",
      subject: "announcement",
      body: "team update",
      kind: "broadcast",
      priority: "normal",
      orchestratorWorkflowId: "mission:mission-1",
    });

    expect(mockPublishTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          channel: "broadcast",
        }),
      })
    );
  });
});

describe("fetchAgentInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters expired messages and sorts by priority", async () => {
    const now = Date.parse("2026-02-13T12:00:00.000Z");
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    mockGetAgentMessageHistory.mockResolvedValue([
      createEnvelope({
        message: {
          id: "low",
          priority: "low",
          createdAt: 3,
        },
      }),
      createEnvelope({
        message: {
          id: "expired",
          priority: "critical",
          expiresAt: Date.now() - 1,
          createdAt: 2,
        },
      }),
      createEnvelope({
        message: {
          id: "critical",
          priority: "critical",
          createdAt: 1,
        },
      }),
    ]);

    const result = await fetchAgentInbox({
      missionId: "mission-1",
      agentId: "agent-b",
      limit: 20,
    });

    expect(result.messages.map((message) => message.id)).toEqual([
      "critical",
      "low",
    ]);

    nowSpy.mockRestore();
  });
});

describe("waitForAgentReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matching reply message", async () => {
    mockGetAgentMessageHistory.mockResolvedValue([
      createEnvelope({
        message: {
          id: "reply-1",
          kind: "reply",
          correlationId: "corr-1",
        },
      }),
    ]);

    const result = await waitForAgentReply({
      missionId: "mission-1",
      agentId: "agent-a",
      correlationId: "corr-1",
      timeoutMs: 1000,
    });

    expect(result.timedOut).toBe(false);
    expect(result.reply?.id).toBe("reply-1");
  });

  it("times out when timeout is zero", async () => {
    const result = await waitForAgentReply({
      missionId: "mission-1",
      agentId: "agent-a",
      correlationId: "corr-1",
      timeoutMs: 0,
    });

    expect(result).toEqual({ reply: null, timedOut: true });
  });
});
