import { isUnfurlableDomain } from "../../unfurl/domain-registry";
import type { SlackClient } from "../client";

type Block = Record<string, unknown>;

interface LinkSharedEvent {
  channel: string;
  message_ts: string;
  links: Array<{ url: string; domain: string }>;
}

interface UnfurlDeps {
  searchByUrl: (
    url: string,
    teamId: string
  ) => Promise<{
    title: string;
    snippet: string;
    source: string;
    author?: string;
    updatedAt?: string;
    url: string;
  } | null>;
}

export async function handleLinkShared(
  client: SlackClient,
  event: LinkSharedEvent,
  teamId: string,
  deps: UnfurlDeps
): Promise<void> {
  const unfurls: Record<string, { blocks: Block[] }> = {};

  for (const link of event.links) {
    if (!isUnfurlableDomain(link.domain)) {
      continue;
    }

    const doc = await deps.searchByUrl(link.url, teamId);
    if (!doc) {
      continue;
    }

    unfurls[link.url] = { blocks: buildUnfurlBlocks(doc) };
  }

  if (Object.keys(unfurls).length === 0) {
    return;
  }

  const noop = Function.prototype as () => void;
  await client
    .call("chat.unfurl", {
      channel: event.channel,
      ts: event.message_ts,
      unfurls,
    })
    .catch(noop);
}

function buildUnfurlBlocks(doc: {
  title: string;
  snippet: string;
  source: string;
  author?: string;
  updatedAt?: string;
  url: string;
}): Block[] {
  const blocks: Block[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${doc.url}|${esc(doc.title)}>*\n${esc(doc.snippet.slice(0, 300))}`,
      },
    },
  ];

  const contextParts: string[] = [doc.source];
  if (doc.author) {
    contextParts.push(`by ${doc.author}`);
  }
  if (doc.updatedAt) {
    contextParts.push(`updated ${doc.updatedAt}`);
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: contextParts.join(" · ") }],
  });

  return blocks;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
