import type { ToolExecutionResult } from "@openplane/types/ai";
import {
  type AgentMessage,
  BROADCAST_RECIPIENT,
  SendMessageInputSchema,
  WaitForReplyInputSchema,
} from "@openplane/types/temporal/mission-messaging";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext } from "./memory";

export interface MissionMessagingServices {
  sendMessage: (input: {
    missionId: string;
    senderId: string;
    senderName?: string;
    recipientId: string;
    subject: string;
    body: unknown;
    kind: "direct" | "broadcast" | "request" | "reply";
    priority: "critical" | "high" | "normal" | "low";
    correlationId?: string;
    replyToMessageId?: string;
    ttlMs?: number;
  }) => Promise<{ messageId: string; delivered: boolean }>;
  waitForReply: (input: {
    missionId: string;
    agentId: string;
    correlationId: string;
    timeoutMs: number;
  }) => Promise<{ reply: AgentMessage | null; timedOut: boolean }>;
  getInbox: (input: {
    missionId: string;
    agentId: string;
    limit?: number;
    unreadOnly?: boolean;
  }) => Promise<{ messages: AgentMessage[] }>;
}

let messagingServices: MissionMessagingServices | null = null;

export function setMissionMessagingServices(
  services: MissionMessagingServices
): void {
  messagingServices = services;
}

function getAgentName(ctx: unknown): string | undefined {
  const root = (ctx as Record<string, unknown>) ?? {};
  const rootAgentName = root.agentName;
  if (typeof rootAgentName === "string" && rootAgentName.length > 0) {
    return rootAgentName;
  }

  const metadata = root.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return;
  }

  const metadataAgentName = (metadata as Record<string, unknown>).agentName;
  if (typeof metadataAgentName === "string" && metadataAgentName.length > 0) {
    return metadataAgentName;
  }
}

export const missionSendMessage = defineTool({
  name: "mission_send_message",
  description:
    "Send a message to another agent in the current mission. Use this to ask questions, share findings, delegate work, or coordinate with teammates. Set recipientId to '*' for broadcast to all agents.",
  category: "mission",
  searchKeywords: [
    "mission",
    "message",
    "send",
    "communicate",
    "agent",
    "delegate",
    "ask",
    "broadcast",
  ],

  parameters: SendMessageInputSchema,

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ messageId: string; delivered: boolean }>> {
    if (!messagingServices) {
      return failure(
        "INVALID_STATE",
        "Mission messaging services not initialized"
      );
    }

    const mCtx = getMissionContext(ctx);

    const result = await messagingServices.sendMessage({
      missionId: mCtx.missionId,
      senderId: mCtx.agentId,
      senderName: getAgentName(ctx),
      recipientId: params.recipientId,
      subject: params.subject,
      body: params.body,
      kind:
        params.recipientId === BROADCAST_RECIPIENT ? "broadcast" : params.kind,
      priority: params.priority,
      correlationId: params.correlationId,
      replyToMessageId: params.replyToMessageId,
      ttlMs: params.ttlMs,
    });

    return success(result);
  },
});

export const missionWaitForReply = defineTool({
  name: "mission_wait_for_reply",
  description:
    "Wait for a reply to a previously sent request message. Blocks until the reply arrives or the timeout is reached. Use this after sending a message with kind='request' and a correlationId.",
  category: "mission",
  searchKeywords: ["mission", "message", "wait", "reply", "response", "block"],

  parameters: WaitForReplyInputSchema,

  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      reply: AgentMessage | null;
      timedOut: boolean;
    }>
  > {
    if (!messagingServices) {
      return failure(
        "INVALID_STATE",
        "Mission messaging services not initialized"
      );
    }

    const mCtx = getMissionContext(ctx);

    const result = await messagingServices.waitForReply({
      missionId: mCtx.missionId,
      agentId: mCtx.agentId,
      correlationId: params.correlationId,
      timeoutMs: params.timeoutMs,
    });

    if (result.timedOut) {
      return failure("TIMEOUT", "No reply received within timeout period", {
        retryable: true,
      });
    }

    return success(result);
  },
});

export const missionGetInbox = defineTool({
  name: "mission_get_inbox",
  description:
    "Retrieve messages from this agent's inbox. Use this to check for incoming requests, replies, or broadcast messages from other agents in the mission.",
  category: "mission",
  searchKeywords: ["mission", "inbox", "messages", "receive", "check"],

  parameters: z.object({
    limit: z.number().default(20).describe("Maximum messages to return"),
    unreadOnly: z
      .boolean()
      .default(false)
      .describe("Only return unread messages"),
  }),

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ messages: AgentMessage[]; count: number }>> {
    if (!messagingServices) {
      return failure(
        "INVALID_STATE",
        "Mission messaging services not initialized"
      );
    }

    const mCtx = getMissionContext(ctx);

    const result = await messagingServices.getInbox({
      missionId: mCtx.missionId,
      agentId: mCtx.agentId,
      limit: params.limit,
      unreadOnly: params.unreadOnly,
    });

    return success({
      messages: result.messages,
      count: result.messages.length,
    });
  },
});
