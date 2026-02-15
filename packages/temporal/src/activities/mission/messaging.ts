import { randomUUID } from "node:crypto";
import {
  getAgentMessageHistory,
  getRedisClient,
  publishAgentMessage,
} from "@openplane/redis";
import type {
  AgentMessage,
  AgentMessageEnvelope,
} from "@openplane/types/temporal/mission-messaging";
import { Context } from "@temporalio/activity";
import { getTemporalClient } from "../../client";
import { agentMessageRouteSignal } from "../../workflows/types";
import { buildPriorityComparator } from "./messaging-memory-bridge";

const MISSION_MSG_LOG_TTL_SECONDS = 24 * 60 * 60;
const MISSION_MSG_LOG_MAX = 1000;
const REPLY_POLL_INTERVAL_MS = 500;
const MSG_DEDUP_TTL_SECONDS = 3600;

export interface RouteMessageInput {
  missionId: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  subject: string;
  body: unknown;
  kind: AgentMessage["kind"];
  priority: AgentMessage["priority"];
  correlationId?: string;
  replyToMessageId?: string;
  ttlMs?: number;
  orchestratorWorkflowId: string;
  requestId?: string;
}

export interface RouteMessageOutput {
  messageId: string;
  delivered: boolean;
}

async function persistMessage(message: AgentMessage): Promise<void> {
  const client = await getRedisClient();
  const key = `agent-msg-log:${message.missionId}`;
  const serialized = JSON.stringify(message);

  await client.lPush(key, serialized);
  await client.lTrim(key, 0, MISSION_MSG_LOG_MAX - 1);
  await client.expire(key, MISSION_MSG_LOG_TTL_SECONDS);
}

export async function routeAgentMessage(
  input: RouteMessageInput
): Promise<RouteMessageOutput> {
  if (input.requestId) {
    const redis = await getRedisClient();
    const dedupKey = `msg-dedup:${input.missionId}:${input.requestId}`;
    const wasSet = await redis.set(dedupKey, "1", {
      NX: true,
      EX: MSG_DEDUP_TTL_SECONDS,
    });
    if (!wasSet) {
      return { messageId: input.requestId, delivered: true };
    }
  }

  const messageId = randomUUID();
  const now = Date.now();

  const message: AgentMessage = {
    id: messageId,
    missionId: input.missionId,
    senderId: input.senderId,
    senderName: input.senderName,
    recipientId: input.recipientId,
    kind: input.kind,
    priority: input.priority,
    subject: input.subject,
    body: input.body,
    correlationId: input.correlationId,
    replyToMessageId: input.replyToMessageId,
    expiresAt: input.ttlMs ? now + input.ttlMs : undefined,
    createdAt: now,
  };

  const envelope: AgentMessageEnvelope = {
    message,
    ttlMs: input.ttlMs,
  };

  await publishAgentMessage(envelope);
  await persistMessage(message);

  let delivered = false;

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(input.orchestratorWorkflowId);
    await handle.signal(agentMessageRouteSignal, { envelope });
    delivered = true;
  } catch {
    delivered = false;
  }

  return { messageId, delivered };
}

export interface FetchInboxInput {
  missionId: string;
  agentId: string;
  limit?: number;
}

export interface FetchInboxOutput {
  messages: AgentMessage[];
}

export async function fetchAgentInbox(
  input: FetchInboxInput
): Promise<FetchInboxOutput> {
  const envelopes = await getAgentMessageHistory(
    input.missionId,
    input.agentId,
    input.limit ?? 50
  );
  const comparator = buildPriorityComparator();
  const now = Date.now();

  const messages = envelopes
    .filter(
      (envelope) =>
        !envelope.message.expiresAt || envelope.message.expiresAt > now
    )
    .map((envelope) => envelope.message)
    .sort(comparator);

  return { messages };
}

export interface WaitForReplyActivityInput {
  missionId: string;
  agentId: string;
  correlationId: string;
  timeoutMs: number;
}

export interface WaitForReplyActivityOutput {
  reply: AgentMessage | null;
  timedOut: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForAgentReply(
  input: WaitForReplyActivityInput
): Promise<WaitForReplyActivityOutput> {
  const startedAt = Date.now();
  const deadline = Date.now() + input.timeoutMs;

  while (Date.now() < deadline) {
    Context.current().heartbeat({
      correlationId: input.correlationId,
      elapsedMs: Date.now() - startedAt,
    });

    const envelopes = await getAgentMessageHistory(
      input.missionId,
      input.agentId,
      100
    );

    const match = envelopes.find(
      (envelope) =>
        envelope.message.kind === "reply" &&
        envelope.message.correlationId === input.correlationId
    );

    if (match) {
      return { reply: match.message, timedOut: false };
    }

    await sleep(REPLY_POLL_INTERVAL_MS);
  }

  return { reply: null, timedOut: true };
}
