import type { AgentMessage } from "@openplane/types/temporal/mission-messaging";
import { describe, expect, it } from "vitest";
import {
  buildPriorityComparator,
  inboxToMemoryValue,
} from "../activities/mission/messaging-memory-bridge";

function createMessage(overrides?: Partial<AgentMessage>): AgentMessage {
  return {
    id: "msg-1",
    missionId: "mission-1",
    senderId: "agent-a",
    recipientId: "agent-b",
    kind: "direct",
    priority: "normal",
    subject: "subject",
    body: { ok: true },
    createdAt: 1,
    ...overrides,
  };
}

describe("inboxToMemoryValue", () => {
  it("maps inbox messages into memory payload", () => {
    const value = inboxToMemoryValue(
      [
        createMessage({
          id: "msg-1",
          senderId: "agent-a",
          senderName: "Researcher",
          subject: "Update",
          createdAt: 10,
        }),
      ],
      123
    );

    expect(value).toEqual({
      count: 1,
      messages: [
        {
          id: "msg-1",
          from: "Researcher",
          subject: "Update",
          body: { ok: true },
          kind: "direct",
          priority: "normal",
          correlationId: undefined,
          createdAt: 10,
        },
      ],
      lastCheckedAt: 123,
    });
  });
});

describe("buildPriorityComparator", () => {
  it("orders by priority first, then by createdAt", () => {
    const comparator = buildPriorityComparator();

    const sorted = [
      createMessage({ id: "low", priority: "low", createdAt: 5 }),
      createMessage({ id: "critical", priority: "critical", createdAt: 20 }),
      createMessage({ id: "high-old", priority: "high", createdAt: 1 }),
      createMessage({ id: "high-new", priority: "high", createdAt: 10 }),
    ].sort(comparator);

    expect(sorted.map((message) => message.id)).toEqual([
      "critical",
      "high-old",
      "high-new",
      "low",
    ]);
  });
});
