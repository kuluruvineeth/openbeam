import type { AgentMessage } from "@openplane/types/temporal/mission-messaging";

export function inboxToMemoryValue(
  messages: AgentMessage[],
  lastCheckedAt = Date.now()
): Record<string, unknown> {
  return {
    count: messages.length,
    messages: messages.map((message) => ({
      id: message.id,
      from: message.senderName ?? message.senderId,
      subject: message.subject,
      body: message.body,
      kind: message.kind,
      priority: message.priority,
      correlationId: message.correlationId,
      createdAt: message.createdAt,
    })),
    lastCheckedAt,
  };
}

export function buildPriorityComparator(): (
  a: AgentMessage,
  b: AgentMessage
) => number {
  const priorityWeight: Record<AgentMessage["priority"], number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  return (a, b) => {
    const weightDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (weightDiff !== 0) {
      return weightDiff;
    }

    return a.createdAt - b.createdAt;
  };
}
