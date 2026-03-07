import type { GmailTransformContext } from "@openbeam/types/services/connectors/gmail";
import type { GenericDocument } from "@openbeam/vespa";
import { createLabelLookup } from "../api/labels";
import { fetchMessagesWithContent } from "../api/messages";
import { getThread } from "../api/threads";
import type { GmailClient } from "../client";
import { transformMessage } from "../transformers/message";
import { transformThread } from "../transformers/thread";

export interface FederatedSearchOptions {
  query: string;
  maxResults?: number;
  includeLabels?: string[];
  excludeLabels?: string[];
  after?: Date;
  before?: Date;
  from?: string;
  to?: string;
  hasAttachment?: boolean;
  threadMode?: boolean;
}

export interface FederatedSearchResult {
  documents: GenericDocument[];
  stats: {
    totalResults: number;
    queryTimeMs: number;
  };
}

export async function federatedSearch(
  client: GmailClient,
  context: GmailTransformContext,
  options: FederatedSearchOptions
): Promise<FederatedSearchResult> {
  const startTime = Date.now();
  const {
    query,
    maxResults = 50,
    includeLabels,
    excludeLabels,
    after,
    before,
    from,
    to,
    hasAttachment,
    threadMode = false,
  } = options;

  const gmailQuery = buildGmailQuery({
    query,
    includeLabels,
    excludeLabels,
    after,
    before,
    from,
    to,
    hasAttachment,
  });

  const labelLookup = await createLabelLookup(client);

  const documents: GenericDocument[] = [];
  const seenThreads = new Set<string>();

  for await (const message of fetchMessagesWithContent(client, {
    query: gmailQuery,
    maxResults,
  })) {
    if (threadMode) {
      if (seenThreads.has(message.threadId)) {
        continue;
      }
      seenThreads.add(message.threadId);

      const thread = await getThread(client, message.threadId);
      if (thread) {
        const result = await transformThread(thread, context, { labelLookup });
        documents.push(result.threadDocument);
      }
    } else {
      const doc = await transformMessage(message, context, { labelLookup });
      documents.push(doc);
    }

    if (documents.length >= maxResults) {
      break;
    }
  }

  return {
    documents,
    stats: {
      totalResults: documents.length,
      queryTimeMs: Date.now() - startTime,
    },
  };
}

interface QueryParts {
  query: string;
  includeLabels?: string[];
  excludeLabels?: string[];
  after?: Date;
  before?: Date;
  from?: string;
  to?: string;
  hasAttachment?: boolean;
}

function buildGmailQuery(parts: QueryParts): string {
  const queryParts: string[] = [];

  if (parts.query) {
    queryParts.push(parts.query);
  }

  if (parts.includeLabels?.length) {
    const labelQueries = parts.includeLabels.map((l) => `label:${l}`);
    queryParts.push(`(${labelQueries.join(" OR ")})`);
  }

  if (parts.excludeLabels?.length) {
    for (const label of parts.excludeLabels) {
      queryParts.push(`-label:${label}`);
    }
  }

  if (parts.after) {
    const dateStr = formatGmailDate(parts.after);
    queryParts.push(`after:${dateStr}`);
  }

  if (parts.before) {
    const dateStr = formatGmailDate(parts.before);
    queryParts.push(`before:${dateStr}`);
  }

  if (parts.from) {
    queryParts.push(`from:${parts.from}`);
  }

  if (parts.to) {
    queryParts.push(`to:${parts.to}`);
  }

  if (parts.hasAttachment) {
    queryParts.push("has:attachment");
  }

  return queryParts.join(" ");
}

function formatGmailDate(date: Date): string {
  const parts = date.toISOString().split("T");
  return parts[0] ?? "";
}

export async function federatedSearchThreads(
  client: GmailClient,
  context: GmailTransformContext,
  options: Omit<FederatedSearchOptions, "threadMode">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    threadMode: true,
  });
}

export async function federatedSearchMessages(
  client: GmailClient,
  context: GmailTransformContext,
  options: Omit<FederatedSearchOptions, "threadMode">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    threadMode: false,
  });
}

export function translateSearchQuery(userQuery: string): string {
  let gmailQuery = userQuery;

  gmailQuery = gmailQuery.replace(/\bsubject:([^\s]+)/g, "subject:$1");
  gmailQuery = gmailQuery.replace(/\bfrom:([^\s]+)/g, "from:$1");
  gmailQuery = gmailQuery.replace(/\bto:([^\s]+)/g, "to:$1");

  gmailQuery = gmailQuery.replace(/\bhas:pdf\b/g, "filename:pdf");
  gmailQuery = gmailQuery.replace(
    /\bhas:doc\b/g,
    "filename:doc OR filename:docx"
  );
  gmailQuery = gmailQuery.replace(
    /\bhas:image\b/g,
    "filename:jpg OR filename:png OR filename:gif"
  );

  gmailQuery = gmailQuery.replace(/\bunread\b/g, "is:unread");
  gmailQuery = gmailQuery.replace(/\bstarred\b/g, "is:starred");
  gmailQuery = gmailQuery.replace(/\bimportant\b/g, "is:important");

  return gmailQuery;
}
