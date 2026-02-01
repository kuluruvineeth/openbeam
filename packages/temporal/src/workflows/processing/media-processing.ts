import {
  MediaProcessingInputSchema,
  type MediaProcessingOutput,
} from "@openplane/types/temporal/workflows";
import {
  executeChild,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import type { EngineActivities } from "../../activities/engine/types";
import type { MediaActivities } from "../../activities/media/types";
import type { StorageActivities } from "../../activities/storage/types";
import { generateWorkflowId } from "../../utils/workflow-id";
import { progressQuery } from "../types";
import { indexDocumentsWorkflow } from "./index-documents";

interface MediaState {
  stage: "downloading" | "processing" | "chunking" | "embedding" | "indexing";
  progress: number;
}

const storageActivities = proxyActivities<StorageActivities>({
  startToCloseTimeout: "30m",
  heartbeatTimeout: "2m",
});

const mediaActivities = proxyActivities<MediaActivities>({
  startToCloseTimeout: "1h",
  heartbeatTimeout: "5m",
  retry: { maximumAttempts: 2 },
});

const engineActivities = proxyActivities<EngineActivities>({
  startToCloseTimeout: "5m",
  heartbeatTimeout: "30s",
});

export async function mediaProcessingWorkflow(
  rawInput: unknown
): Promise<MediaProcessingOutput> {
  const input = MediaProcessingInputSchema.parse(rawInput);
  const state: MediaState = { stage: "downloading", progress: 0 };

  setHandler(progressQuery, () => ({
    processed: 0,
    indexed: 0,
    errors: 0,
    stage: state.stage,
  }));

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

  await executeChild(indexDocumentsWorkflow, {
    args: [{ documents, connectorId: input.connectorId }],
    workflowId: generateWorkflowId({
      type: "index",
      connectorId: input.connectorId,
    }),
  });

  await storageActivities.cleanupTempFile({ path: downloadResult.localPath });

  return {
    mediaId: input.mediaId,
    segments: mediaResult.segments.length,
    duration: mediaResult.duration,
  };
}
