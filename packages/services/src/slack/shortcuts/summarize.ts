import type { KnownBlock, View } from "@slack/web-api";
import { getAllThreadReplies } from "../api/messages";
import type { SlackClient } from "../client";
import type { MessageShortcutPayload } from "../interactivity/types";
import type { MessageContext, ShortcutResult, ThreadSummary } from "./types";

interface ChatPostEphemeralResponse {
  ok: boolean;
  message_ts?: string;
  error?: string;
}

interface RagProvider {
  answer(params: {
    query: string;
    context: string;
    systemPrompt?: string;
  }): Promise<{
    answer: string;
    citations: Array<{ title: string; url?: string }>;
  }>;
}

export interface SummarizeShortcutDeps {
  ragService: RagProvider;
}

const SUMMARY_REGEX = /summary[:\s]*([^*#]+)/i;
const BULLET_PREFIX_REGEX = /^[-•*]\s*/;
const PARAGRAPH_SPLIT_REGEX = /\n\n+/;
const HEADING_PREFIX_REGEX = /^[#*\s]+/;

const THREAD_SUMMARY_PROMPT = `Analyze the following Slack thread conversation and provide:

1. A concise summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Any action items or decisions made
4. Main participants

Be concise and focus on the most important information. Format the response clearly.`;

export async function handleSummarizeShortcut(
  client: SlackClient,
  payload: MessageShortcutPayload,
  deps: SummarizeShortcutDeps
): Promise<ShortcutResult> {
  const context = extractMessageContext(payload, client.teamId ?? "");

  const threadTs = context.threadTs ?? context.messageTs;

  const messages = await getAllThreadReplies(
    client,
    context.channelId,
    threadTs
  );

  if (messages.length === 0) {
    return {
      success: false,
      error: "No messages found in this thread",
    };
  }

  const threadContent = formatThreadForSummary(messages);

  const result = await deps.ragService.answer({
    query: "Summarize this thread conversation",
    context: threadContent,
    systemPrompt: THREAD_SUMMARY_PROMPT,
  });

  const summary = parseThreadSummary(result.answer, messages);

  const blocks = buildSummaryBlocks(summary);

  await client.call<ChatPostEphemeralResponse>("chat.postEphemeral", {
    channel: context.channelId,
    user: context.userId,
    text: summary.summary,
    blocks,
    thread_ts: threadTs,
  });

  return {
    success: true,
    message: "Thread summary generated",
    data: summary,
  };
}

export function buildSummaryBlocks(summary: ThreadSummary): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Thread Summary",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: summary.summary,
      },
    },
  ];

  if (summary.keyPoints.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Key Points:*\n${summary.keyPoints.map((p) => `• ${p}`).join("\n")}`,
      },
    });
  }

  if (summary.actionItems.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Action Items:*\n${summary.actionItems.map((a) => `☐ ${a}`).join("\n")}`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `📊 ${summary.messageCount} messages from ${summary.participants.length} participants`,
      },
    ],
  });

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Share to Channel",
          emoji: true,
        },
        action_id: "share_summary",
        style: "primary",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Copy Text",
          emoji: true,
        },
        action_id: "copy_summary",
      },
    ],
  });

  return blocks;
}

export function buildSummaryModal(summary: ThreadSummary): View {
  return {
    type: "modal",
    callback_id: "summary_modal",
    title: {
      type: "plain_text",
      text: "Thread Summary",
    },
    close: {
      type: "plain_text",
      text: "Close",
    },
    blocks: buildSummaryBlocks(summary),
  };
}

interface SlackMessage {
  text?: string;
  user?: string;
  ts?: string;
}

function formatThreadForSummary(messages: SlackMessage[]): string {
  return messages
    .map((msg, idx) => {
      const author = msg.user ?? "Unknown";
      const text = msg.text ?? "";
      return `[${idx + 1}] ${author}: ${text}`;
    })
    .join("\n\n");
}

function parseThreadSummary(
  aiResponse: string,
  messages: SlackMessage[]
): ThreadSummary {
  const participants = [
    ...new Set(messages.map((m) => m.user).filter(Boolean)),
  ] as string[];

  const keyPoints = extractBulletPoints(aiResponse, "key points");
  const actionItems = extractBulletPoints(aiResponse, "action items");

  const summaryMatch = aiResponse.match(SUMMARY_REGEX);
  const summary = summaryMatch?.[1]
    ? summaryMatch[1].trim()
    : extractFirstParagraph(aiResponse);

  return {
    summary: truncate(summary, 500),
    keyPoints: keyPoints.slice(0, 5),
    participants,
    messageCount: messages.length,
    actionItems: actionItems.slice(0, 5),
  };
}

function extractBulletPoints(text: string, section: string): string[] {
  const sectionRegex = new RegExp(
    `${section}[:\\s]*([\\s\\S]*?)(?=\\n\\n|\\*\\*|##|$)`,
    "i"
  );
  const match = text.match(sectionRegex);

  if (!match?.[1]) {
    return [];
  }

  const content = match[1];
  const bullets = content.match(/[-•*]\s*([^\n]+)/g);

  if (!bullets) {
    return [];
  }

  return bullets.map((b) => b.replace(BULLET_PREFIX_REGEX, "").trim());
}

function extractFirstParagraph(text: string): string {
  const paragraphs = text.split(PARAGRAPH_SPLIT_REGEX);
  for (const p of paragraphs) {
    const clean = p.replace(HEADING_PREFIX_REGEX, "").trim();
    if (clean.length > 20) {
      return clean;
    }
  }
  return text.slice(0, 200);
}

function extractMessageContext(
  payload: MessageShortcutPayload,
  teamId: string
): MessageContext {
  return {
    channelId: payload.channel.id,
    messageTs: payload.message.ts,
    threadTs: payload.message.thread_ts,
    userId: payload.user.id,
    messageText: payload.message.text,
    messageAuthor: payload.message.user,
    teamId,
    connectorId: "",
  };
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}
