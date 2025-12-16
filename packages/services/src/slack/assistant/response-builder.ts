import type { KnownBlock } from "@slack/web-api";
import type {
  ScoredMedia,
  SearchScoredDocument,
  UnifiedSearchItem,
  UnifiedSearchResult,
} from "../../search/types";
import type { AssistantResponse, Citation } from "./types";

export interface ResponseBlocksOptions {
  showSources?: boolean;
  showFeedbackButtons?: boolean;
  maxCitations?: number;
  threadTs?: string;
  responseKey?: string;
}

export function buildResponseBlocks(
  response: AssistantResponse,
  options: ResponseBlocksOptions = {}
): KnownBlock[] {
  const {
    showSources = true,
    showFeedbackButtons = true,
    maxCitations = 5,
    responseKey,
  } = options;
  const blocks: KnownBlock[] = [];

  const formattedAnswer = toSlackMrkdwn(response.answer);

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: truncate(formattedAnswer, 3000) },
  });

  if (showSources && response.citations.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: formatSources(response.citations.slice(0, maxCitations)),
      },
    });
  }

  if (showFeedbackButtons) {
    blocks.push({
      type: "actions",
      block_id: "assistant_feedback",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Share", emoji: true },
          action_id: "assistant_share_response",
          value: responseKey,
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Not helpful", emoji: true },
          action_id: "assistant_not_helpful",
          value: responseKey,
        },
      ],
    });
  }

  return blocks;
}

export function buildEphemeralPayload(
  response: AssistantResponse,
  options: ResponseBlocksOptions = {}
): { text: string; blocks: KnownBlock[] } {
  return {
    text: truncate(toSlackMrkdwn(response.answer), 500),
    blocks: buildResponseBlocks(response, options),
  };
}

export function buildSharedResponseBlocks(
  response: AssistantResponse,
  originalUser: string
): KnownBlock[] {
  const formattedAnswer = truncate(toSlackMrkdwn(response.answer), 3000);
  const blocks: KnownBlock[] = [
    { type: "section", text: { type: "mrkdwn", text: formattedAnswer } },
  ];

  if (response.citations.length > 0) {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: formatSources(response.citations.slice(0, 3)) },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `Shared by <@${originalUser}>` }],
  });

  return blocks;
}

export function buildSearchResultBlocks(
  query: string,
  results: Array<{
    title: string;
    url?: string;
    content?: string;
    source?: string;
  }>,
  total: number
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Results for "${truncate(query, 40)}"`,
        emoji: false,
      },
    },
  ];

  if (results.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "No results found." },
    });
    return blocks;
  }

  for (const result of results.slice(0, 5)) {
    const title = result.url
      ? `<${result.url}|${truncate(result.title, 80)}>`
      : truncate(result.title, 80);
    const snippet = result.content ? `\n${truncate(result.content, 120)}` : "";
    const source = result.source ? `  ·  ${result.source}` : "";

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*${snippet}${source}` },
    });
  }

  if (total > results.length) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `${total} total results` }],
    });
  }

  return blocks;
}

function getSourceIcon(
  connectorType?: string,
  sourceType?: "document" | "media"
): string {
  if (sourceType === "media") {
    return ":movie_camera:";
  }

  switch (connectorType?.toLowerCase()) {
    case "slack":
      return ":slack:";
    case "notion":
      return ":notion:";
    case "google_drive":
    case "googledrive":
      return ":google-drive:";
    case "confluence":
      return ":confluence:";
    case "jira":
      return ":jira:";
    case "github":
      return ":github:";
    case "linear":
      return ":linear:";
    case "dropbox":
      return ":dropbox:";
    case "onedrive":
    case "sharepoint":
      return ":microsoft:";
    default:
      return ":page_facing_up:";
  }
}

function formatSources(citations: Citation[]): string {
  if (citations.length === 0) {
    return "";
  }

  const lines = citations.map((c) => {
    const icon = getSourceIcon(c.connectorType, c.sourceType);
    const link = c.url
      ? `<${c.url}|${truncate(c.title, 40)}>`
      : truncate(c.title, 40);
    return `${icon}  ${link}`;
  });

  return `*Sources*\n${lines.join("\n")}`;
}

function toSlackMrkdwn(text: string): string {
  let result = text;

  // Convert markdown bold **text** to Slack *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, "*$1*");

  // Convert markdown italic _text_ (already Slack compatible) - no change needed
  // Convert markdown links [text](url) to Slack <url|text>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");

  // Convert markdown headers to bold (Slack doesn't support headers)
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  // Convert markdown horizontal rules to divider-like text
  result = result.replace(/^[-*_]{3,}$/gm, "───");

  // Convert markdown bullet points - and * to •
  result = result.replace(/^(\s*)[-*]\s+/gm, "$1• ");

  // Escape angle brackets in non-link contexts (but preserve our converted links)
  // This is tricky - we need to be careful not to break <url|text> links

  return result;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) {
    return "";
  }
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function formatTime(ts?: number): string {
  if (!ts) {
    return "";
  }
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) {
    return d === 1 ? "Yesterday" : `${d}d ago`;
  }
  if (h > 0) {
    return `${h}h ago`;
  }
  if (m > 0) {
    return `${m}m ago`;
  }
  return "Now";
}

function buildDocumentResult(doc: SearchScoredDocument): KnownBlock[] {
  const title = doc.url
    ? `<${doc.url}|${truncate(doc.title ?? "Untitled", 70)}>`
    : truncate(doc.title ?? "Untitled", 70);

  const meta: string[] = [];
  if (doc.source_name) {
    meta.push(doc.source_name);
  }
  if (doc.created_at) {
    meta.push(formatTime(doc.created_at));
  }

  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: doc.content
          ? `*${title}*\n${truncate(doc.content, 100)}`
          : `*${title}*`,
      },
    },
  ];

  if (meta.length > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: meta.join("  ·  ") }],
    });
  }

  return blocks;
}

function buildMediaResult(media: ScoredMedia): KnownBlock[] {
  const linkUrl =
    (media.metadata?.sourceUrl as string | undefined) ?? media.url;
  const title = linkUrl
    ? `<${linkUrl}|${truncate(media.title ?? "Untitled", 70)}>`
    : truncate(media.title ?? "Untitled", 70);

  const meta: string[] = [];
  if (media.source_name) {
    meta.push(media.source_name);
  }
  const duration = formatDuration(media.duration_seconds);
  if (duration) {
    meta.push(duration);
  }
  if (media.created_at) {
    meta.push(formatTime(media.created_at));
  }

  const blocks: KnownBlock[] = [];

  if (media.thumbnail_url) {
    blocks.push({
      type: "image",
      image_url: media.thumbnail_url,
      alt_text: media.title ?? "Media thumbnail",
    });
  }

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: `*${title}*` },
  });

  if (meta.length > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: meta.join("  ·  ") }],
    });
  }

  return blocks;
}

function buildResultItem(item: UnifiedSearchItem): KnownBlock[] {
  return item.type === "media"
    ? buildMediaResult(item.data)
    : buildDocumentResult(item.data);
}

export function buildUnifiedSearchResultBlocks(
  query: string,
  results: UnifiedSearchResult
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Results for "${truncate(query, 40)}"`,
        emoji: false,
      },
    },
  ];

  if (results.items.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "No results found." },
    });
    return blocks;
  }

  for (const item of results.items.slice(0, 6)) {
    blocks.push(...buildResultItem(item));
    blocks.push({ type: "divider" });
  }

  blocks.pop();

  const summary: string[] = [`${results.total} results`];
  if (results.documentTotal > 0 && results.mediaTotal > 0) {
    summary.push(
      `${results.documentTotal} docs`,
      `${results.mediaTotal} media`
    );
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: summary.join("  ·  ") }],
  });

  return blocks;
}
