import type { KnownBlock } from "@slack/web-api";
import { ragAnswer } from "../../ai/rag";
import { searchService } from "../../search";
import { HOME_CALLBACK_IDS } from "../home/types";
import type { DigestConfig, DigestContent, DigestHighlight } from "./types";

const DIGEST_SYSTEM_PROMPT = `Create a brief digest summary. Your response MUST be under 2000 characters.

Format using Slack mrkdwn (NOT standard markdown):
- Use *bold* (single asterisk) not **bold**
- Use _italic_ (underscores)
- Use flat bullet points with • or -

Structure:
*Decisions*
• One-line summary of each decision

*Announcements*
• One-line summary of each announcement

*Action Items*
• One-line summary of each action item

Rules:
- Maximum 3 bullets per section
- One sentence per bullet, no sub-bullets
- Skip sections with no content
- Be extremely concise
- Never use ** for bold, only single *`;

const MS_PER_HOUR = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const BULLET_PATTERN = /^[-•]\s*/;
const SLACK_TEXT_LIMIT = 2900;

export async function generateDailyDigest(
  config: DigestConfig
): Promise<DigestContent | null> {
  const lookbackHours =
    config.frequency === "weekly"
      ? DAYS_PER_WEEK * HOURS_PER_DAY
      : HOURS_PER_DAY;
  const lookbackMs = lookbackHours * MS_PER_HOUR;
  const fromDate = Date.now() - lookbackMs;

  const results = await searchService.search({
    query: "",
    teamId: config.teamId,
    accessControlIds: config.accessControlIds,
    fromDate,
    limit: 100,
    ranking: "recency",
    documentTypes: ["message"],
    sourceIds: config.channelIds.length > 0 ? config.channelIds : undefined,
  });

  if (results.documents.length === 0) {
    return null;
  }

  const uniqueChannels = new Set(
    results.documents.map((d) => d.source_id).filter(Boolean)
  );

  const summaryResult = await ragAnswer({
    query:
      "Summarize the key discussions, decisions, and action items from these messages",
    teamId: config.teamId,
    accessControlIds: config.accessControlIds,
    topK: 30,
    systemPrompt: DIGEST_SYSTEM_PROMPT,
  });

  const cleanedSummary = toSlackMrkdwn(summaryResult.answer);
  const highlights = extractHighlights(cleanedSummary);

  return {
    summary: cleanedSummary,
    highlights,
    messageCount: results.documents.length,
    channelCount: uniqueChannels.size,
    generatedAt: new Date(),
  };
}

export function buildDigestBlocks(
  digest: DigestContent,
  frequency: "daily" | "weekly" = "daily"
): KnownBlock[] {
  const dateStr = digest.generatedAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const headerText =
    frequency === "weekly"
      ? `📰 Your Weekly Digest - ${dateStr}`
      : `📰 Your Daily Digest - ${dateStr}`;

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: headerText,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateText(digest.summary, SLACK_TEXT_LIMIT),
      },
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Based on ${digest.messageCount} messages from ${digest.channelCount} channels`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open OpenBeam", emoji: true },
          url: process.env.WEB_APP_URL ?? "https://app.openbeam.work",
          action_id: "open_app",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Configure Digest", emoji: true },
          action_id: HOME_CALLBACK_IDS.CONFIGURE_DIGEST,
        },
      ],
    },
  ];

  return blocks;
}

function extractHighlights(summary: string): DigestHighlight[] {
  const highlights: DigestHighlight[] = [];
  const lines = summary.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!(trimmed.startsWith("-") || trimmed.startsWith("•"))) {
      continue;
    }

    const content = trimmed.replace(BULLET_PATTERN, "");
    const type = classifyHighlight(content);

    highlights.push({ type, content });
  }

  return highlights;
}

function classifyHighlight(content: string): DigestHighlight["type"] {
  const lower = content.toLowerCase();

  if (
    lower.includes("decided") ||
    lower.includes("decision") ||
    lower.includes("agreed")
  ) {
    return "decision";
  }
  if (
    lower.includes("announc") ||
    lower.includes("update:") ||
    lower.includes("fyi")
  ) {
    return "announcement";
  }
  if (
    lower.includes("action") ||
    lower.includes("todo") ||
    lower.includes("follow up") ||
    lower.includes("deadline")
  ) {
    return "action_item";
  }
  return "discussion";
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength - 3);
  const lastNewline = truncated.lastIndexOf("\n");
  if (lastNewline > maxLength * 0.7) {
    return `${truncated.slice(0, lastNewline)}\n...`;
  }
  return `${truncated}...`;
}

function toSlackMrkdwn(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/^(\s*)[-•]\s+[-•]\s+/gm, "$1• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
