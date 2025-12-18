import type { GenericDocument } from "@openplane/vespa";
import {
  type SlackCanvas as ApiSlackCanvas,
  getCanvasContent,
  type ListCanvasesOptions,
  listAllCanvases,
} from "../api/canvas";
import { createUserLookup } from "../api/users";
import type { SlackClient } from "../client";
import {
  type CanvasTransformContext,
  type SlackCanvas,
  transformCanvas,
} from "../transformers/canvas";
import type { SyncBatch, TransformContext } from "../types";

export interface CanvasSyncOptions {
  batchSize?: number;
  channelId?: string;
  includeContent?: boolean;
}

export async function* syncCanvasesBatched(
  client: SlackClient,
  context: TransformContext,
  options: CanvasSyncOptions = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = 50, channelId, includeContent = true } = options;

  const userLookup = await createUserLookup(client);
  const batch: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const listOptions: ListCanvasesOptions = { channelId };

  for await (const rawCanvas of listAllCanvases(client, listOptions)) {
    try {
      const canvas = await enrichCanvas(client, rawCanvas, includeContent);
      const transformContext: CanvasTransformContext = {
        ...context,
        userLookup,
      };
      const doc = transformCanvas(canvas, transformContext);
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

async function enrichCanvas(
  client: SlackClient,
  canvas: ApiSlackCanvas,
  includeContent: boolean
): Promise<SlackCanvas> {
  let documentContent = canvas.documentContent;
  if (includeContent && !documentContent) {
    documentContent = (await getCanvasContent(client, canvas.id)) ?? undefined;
  }

  return {
    id: canvas.id,
    title: canvas.title,
    channelId: canvas.channelId,
    documentContent,
    lastModified: canvas.lastModified,
    lastModifiedBy: canvas.lastModifiedBy,
    isPublished: canvas.isPublished,
    accessLevel: canvas.accessLevel,
  };
}
