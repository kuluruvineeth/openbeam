import type { GenericDocument } from "@openplane/vespa";
import {
  type SlackClip as ApiSlackClip,
  type ListClipsOptions,
  listAllClips,
} from "../api/clips";
import { createUserLookup } from "../api/users";
import type { SlackClient } from "../client";
import {
  type ClipTransformContext,
  type SlackClip,
  transformClip,
} from "../transformers/clip";
import type { SyncBatch, TransformContext } from "../types";

export interface ClipSyncOptions {
  batchSize?: number;
  channelId?: string;
  userId?: string;
}

export async function* syncClipsBatched(
  client: SlackClient,
  context: TransformContext,
  options: ClipSyncOptions = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = 50, channelId, userId } = options;

  const userLookup = await createUserLookup(client);
  const batch: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const listOptions: ListClipsOptions = { channelId, userId };

  for await (const rawClip of listAllClips(client, listOptions)) {
    try {
      const clip = mapApiClipToClip(rawClip);
      const transformContext: ClipTransformContext = {
        ...context,
        userLookup,
      };
      const doc = transformClip(clip, transformContext);
      batch.push(doc);
      processed += 1;
    } catch {
      errors += 1;
    }

    if (batch.length >= batchSize) {
      yield {
        items: batch.splice(0, batch.length),
        cursor: {},
        hasMore: true,
        stats: { processed, skipped: 0, errors },
      };
    }
  }

  if (batch.length > 0) {
    yield {
      items: batch,
      cursor: {},
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  }
}

function mapApiClipToClip(apiClip: ApiSlackClip): SlackClip {
  return {
    id: apiClip.id,
    title: apiClip.title,
    channelId: apiClip.channelId,
    userId: apiClip.userId,
    duration: apiClip.duration,
    transcript: apiClip.transcript,
    thumbnailUrl: apiClip.thumbnailUrl,
    videoUrl: apiClip.videoUrl,
    createdAt: apiClip.createdAt,
    viewCount: apiClip.viewCount,
  };
}
