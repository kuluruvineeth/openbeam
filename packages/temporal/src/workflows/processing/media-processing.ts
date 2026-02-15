import {
  MediaProcessingInputSchema,
  type MediaProcessingOutput,
} from "@openplane/types/temporal/workflows";
import {
  executeChild,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { EngineActivities } from "../../activities/engine/types";
import type { MediaActivities } from "../../activities/media/types";
import type { StorageActivities } from "../../activities/storage/types";
import { generateWorkflowId } from "../../utils/workflow-id";
import { progressQuery, type SyncState } from "../types";
import { indexDocumentsWorkflow } from "./index-documents";

const storageActivities = proxyActivities<StorageActivities>({
  startToCloseTimeout: "30m",
  scheduleToCloseTimeout: "90m",
  heartbeatTimeout: "2m",
});

const mediaActivities = proxyActivities<MediaActivities>({
  startToCloseTimeout: "1h",
  scheduleToCloseTimeout: "3h",
  heartbeatTimeout: "5m",
  retry: { maximumAttempts: 2 },
});

const engineActivities = proxyActivities<EngineActivities>({
  startToCloseTimeout: "5m",
  scheduleToCloseTimeout: "15m",
  heartbeatTimeout: "30s",
});

export async function mediaProcessingWorkflow(
  rawInput: unknown
): Promise<MediaProcessingOutput> {
  const input = MediaProcessingInputSchema.parse(rawInput);
  const state: SyncState = {
    processed: 0,
    indexed: 0,
    errors: 0,
    dataAdded: 0,
    dataUpdated: 0,
    dataDeleted: 0,
    stage: "downloading",
  };

  setHandler(progressQuery, () => state);

  const downloadResult = await storageActivities.downloadFile({
    url: input.sourceUrl,
    connectorId: input.connectorId,
    externalId: input.mediaId,
  });

  state.stage = "processing";
  const mediaResult = await mediaActivities.processMedia({
    path: downloadResult.localPath,
    mediaType: input.mediaType,
    features: ["transcription", "scene_detection", "object_recognition"],
  });

  state.stage = "chunking";
  const fullTranscript = mediaResult.segments
    .map((segment) => segment.transcription)
    .join("\n\n");

  const chunked = await engineActivities.chunk({
    text: fullTranscript,
    maxCharacters: 512,
    overlap: 50,
  });

  state.stage = "embedding";
  const embedded = await engineActivities.generateEmbeddings({
    texts: chunked.chunks.map((c) => c.text),
    returnSparse: true,
  });

  state.stage = "indexing";
  const documents = chunked.chunks.map((chunk, i) => ({
    id: `${input.connectorId}:${input.mediaId}:${chunk.index}`,
    connector_id: input.connectorId,
    external_id: `${input.mediaId}:${chunk.index}`,
    content: chunk.text,
    chunk_index: chunk.index,
    dense_embedding: embedded.embeddings[i],
    sparse_embedding: embedded.sparseEmbeddings?.[i],
    metadata: {
      mediaId: input.mediaId,
      chunkIndex: chunk.index,
      totalChunks: chunked.totalChunks,
    },
  }));

  const indexResult = await executeChild(indexDocumentsWorkflow, {
    args: [{ documents, connectorId: input.connectorId }],
    workflowId: generateWorkflowId({
      type: "index",
      connectorId: input.connectorId,
      timestamp: workflowInfo().unsafe.now(),
    }),
  });

  state.processed = documents.length;
  state.indexed = indexResult.indexed;
  state.dataAdded = indexResult.dataAdded ?? 0;
  state.dataUpdated = indexResult.dataUpdated ?? 0;

  await storageActivities.cleanupTempFile({ path: downloadResult.localPath });

  return {
    mediaId: input.mediaId,
    segments: mediaResult.segments.length,
    duration: mediaResult.duration,
  };
}
