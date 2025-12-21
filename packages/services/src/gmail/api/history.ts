import type { GmailClient } from "../client";
import {
  GmailApiError,
  GmailErrorCodes,
  type GmailHistoryListResponse,
  GmailHistoryListResponseSchema,
  type GmailHistoryRecord,
} from "../types";

export interface HistoryOptions {
  startHistoryId: string;
  labelId?: string;
  labelIds?: string[];
  historyTypes?: Array<
    "messageAdded" | "messageDeleted" | "labelAdded" | "labelRemoved"
  >;
  maxResults?: number;
  pageToken?: string;
}

export interface HistoryChange {
  type: "added" | "deleted" | "labelAdded" | "labelRemoved";
  messageId: string;
  threadId: string;
  labelIds?: string[];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pagination with error handling requires branching
export async function* fetchHistory(
  client: GmailClient,
  options: HistoryOptions
): AsyncGenerator<GmailHistoryRecord, { historyId: string } | null, undefined> {
  const {
    startHistoryId,
    labelId,
    labelIds,
    historyTypes,
    maxResults = 500,
  } = options;
  let pageToken = options.pageToken;
  let fetched = 0;
  let latestHistoryId: string | undefined;

  do {
    const params: Record<string, string | number | string[] | undefined> = {
      startHistoryId,
      maxResults: Math.min(maxResults - fetched, 500),
      pageToken,
    };

    if (labelId) {
      params.labelId = labelId;
    }

    if (labelIds?.length) {
      params.labelIds = labelIds.join(",");
    }

    if (historyTypes?.length) {
      params.historyTypes = historyTypes;
    }

    let response: GmailHistoryListResponse;
    try {
      response = await client.get<GmailHistoryListResponse>(
        "/users/me/history",
        params
      );
    } catch (error) {
      if (error instanceof GmailApiError && error.statusCode === 404) {
        throw new GmailApiError(
          "History ID expired - full sync required",
          GmailErrorCodes.HISTORY_ID_EXPIRED,
          false
        );
      }
      throw error;
    }

    const parsed = GmailHistoryListResponseSchema.safeParse(response);
    if (!parsed.success) {
      continue;
    }

    if (parsed.data.historyId) {
      latestHistoryId = parsed.data.historyId;
    }

    const historyRecords = parsed.data.history ?? [];
    for (const record of historyRecords) {
      yield record;
      fetched += 1;
      if (fetched >= maxResults) {
        return latestHistoryId ? { historyId: latestHistoryId } : null;
      }
    }

    pageToken = parsed.data.nextPageToken;
  } while (pageToken && fetched < maxResults);

  return latestHistoryId ? { historyId: latestHistoryId } : null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parsing multiple change types requires iteration
export function parseHistoryChanges(
  records: GmailHistoryRecord[]
): HistoryChange[] {
  const changes: HistoryChange[] = [];

  for (const record of records) {
    if (record.messagesAdded) {
      for (const added of record.messagesAdded) {
        changes.push({
          type: "added",
          messageId: added.message.id,
          threadId: added.message.threadId,
          labelIds: added.message.labelIds,
        });
      }
    }

    if (record.messagesDeleted) {
      for (const deleted of record.messagesDeleted) {
        changes.push({
          type: "deleted",
          messageId: deleted.message.id,
          threadId: deleted.message.threadId,
        });
      }
    }

    if (record.labelsAdded) {
      for (const labelChange of record.labelsAdded) {
        changes.push({
          type: "labelAdded",
          messageId: labelChange.message.id,
          threadId: labelChange.message.threadId,
          labelIds: labelChange.labelIds,
        });
      }
    }

    if (record.labelsRemoved) {
      for (const labelChange of record.labelsRemoved) {
        changes.push({
          type: "labelRemoved",
          messageId: labelChange.message.id,
          threadId: labelChange.message.threadId,
          labelIds: labelChange.labelIds,
        });
      }
    }
  }

  return changes;
}

export function dedupeHistoryChanges(
  changes: HistoryChange[]
): HistoryChange[] {
  const seen = new Set<string>();
  const deduped: HistoryChange[] = [];

  for (const change of changes) {
    const key = `${change.type}:${change.messageId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(change);
    }
  }

  return deduped;
}

export function groupChangesByThread(
  changes: HistoryChange[]
): Map<string, HistoryChange[]> {
  const grouped = new Map<string, HistoryChange[]>();

  for (const change of changes) {
    const existing = grouped.get(change.threadId) ?? [];
    existing.push(change);
    grouped.set(change.threadId, existing);
  }

  return grouped;
}

export function getAddedMessageIds(changes: HistoryChange[]): string[] {
  return changes.filter((c) => c.type === "added").map((c) => c.messageId);
}

export function getDeletedMessageIds(changes: HistoryChange[]): string[] {
  return changes.filter((c) => c.type === "deleted").map((c) => c.messageId);
}

export function getAffectedThreadIds(changes: HistoryChange[]): string[] {
  return [...new Set(changes.map((c) => c.threadId))];
}
