import type {
  GongSyncBatch,
  GongTransformContext,
} from "@openbeam/types/services/connectors/gong";
import type { GenericDocument } from "@openbeam/vespa";
import type { GongClient, GongTranscript } from "../client";
import { transformCalls } from "../transformers/call";
import { createSyncBatch } from "./utils";

const TRANSCRIPT_BATCH_SIZE = 20;

interface IncrementalSyncOptions {
  lastSyncTime: number;
  callDirectionFilter?: string;
}

export async function* incrementalSync(
  client: GongClient,
  context: GongTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<GongSyncBatch<GenericDocument>, void, undefined> {
  const fromDateTime = new Date(options.lastSyncTime).toISOString();
  const { callDirectionFilter = "" } = options;

  let callCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.listCalls({
      fromDateTime,
      cursor: callCursor,
    });

    let calls = response.calls;

    if (callDirectionFilter) {
      const filter = callDirectionFilter.toLowerCase();
      calls = calls.filter((c) => c.direction.toLowerCase() === filter);
    }

    let transcriptMap: Map<string, GongTranscript> | undefined;
    if (context.syncTranscripts && calls.length > 0) {
      transcriptMap = await fetchTranscriptsForCalls(
        client,
        calls.map((c) => c.id)
      );
    }

    const documents = await transformCalls(calls, context, transcriptMap);

    hasMore = Boolean(response.records.cursor);
    callCursor = response.records.cursor;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now(), lastCallCursor: callCursor },
      "calls",
      hasMore
    );
  }
}

async function fetchTranscriptsForCalls(
  client: GongClient,
  callIds: string[]
): Promise<Map<string, GongTranscript>> {
  const map = new Map<string, GongTranscript>();

  for (let i = 0; i < callIds.length; i += TRANSCRIPT_BATCH_SIZE) {
    const batch = callIds.slice(i, i + TRANSCRIPT_BATCH_SIZE);
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await client.getCallTranscripts({
        callIds: batch,
        cursor,
      });

      for (const transcript of response.callTranscripts) {
        map.set(transcript.callId, transcript);
      }

      hasMore = Boolean(response.records.cursor);
      cursor = response.records.cursor;
    }
  }

  return map;
}
