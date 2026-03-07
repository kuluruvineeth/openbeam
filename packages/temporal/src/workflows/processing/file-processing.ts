import {
  FileProcessingInputSchema,
  type FileProcessingOutput,
} from "@openbeam/types/temporal/workflows";
import {
  executeChild,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import type { ConnectorFileActivities } from "../../activities/connectors/types";
import type { DatabaseActivities } from "../../activities/database/types";
import type { EngineActivities } from "../../activities/engine/types";
import type { StorageActivities } from "../../activities/storage/types";
import { generateWorkflowId } from "../../utils/workflow-id";
import { currentTimestamp } from "../temporal-utils";
import type { SyncState } from "../types";
import { progressQuery } from "../types";
import { indexDocumentsWorkflow } from "./index-documents";

const storageActivities = proxyActivities<StorageActivities>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "30m",
  heartbeatTimeout: "1m",
});

const engineActivities = proxyActivities<EngineActivities>({
  startToCloseTimeout: "5m",
  scheduleToCloseTimeout: "15m",
  heartbeatTimeout: "30s",
});

const connectorFileActivities = proxyActivities<ConnectorFileActivities>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "30m",
  heartbeatTimeout: "1m",
  retry: {
    initialInterval: "5s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["AuthorizationError"],
  },
});

const databaseActivities = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "2m",
  retry: { maximumAttempts: 3 },
});

export async function fileProcessingWorkflow(
  rawInput: unknown
): Promise<FileProcessingOutput> {
  const input = FileProcessingInputSchema.parse(rawInput);
  const state: SyncState = {
    processed: 0,
    indexed: 0,
    errors: 0,
    dataAdded: 0,
    dataUpdated: 0,
    dataDeleted: 0,
    stage: "initializing",
  };

  setHandler(progressQuery, () => state);

  const connector = await databaseActivities.loadConnector(input.connectorId);

  state.stage = "fetching";

  const downloadMetadata: Record<string, string> = {
    ...input.metadata,
    downloadUrl: input.downloadUrl ?? input.metadata?.downloadUrl ?? "",
  };

  const downloadResult = await connectorFileActivities.downloadFile({
    connector,
    fileId: input.externalId,
    mimeType: input.mimeType,
    metadata: downloadMetadata,
  });

  state.stage = "parsing";
  const parsed = await engineActivities.parse({
    url: downloadResult.localPath,
    filename: input.externalId,
  });

  state.stage = "chunking";
  const chunked = await engineActivities.chunk({
    text: parsed.elements.map((e) => e.text).join("\n\n"),
    maxCharacters: 1000,
    overlap: 200,
  });

  state.stage = "embedding";
  const embedded = await engineActivities.generateEmbeddings({
    texts: chunked.chunks.map((c) => c.text),
    returnSparse: true,
  });

  state.stage = "indexing";
  const documents = chunked.chunks.map((chunk, i) => ({
    id: `${input.connectorId}:${input.externalId}:${chunk.index}`,
    connector_id: input.connectorId,
    external_id: input.externalId,
    chunk_index: chunk.index,
    content: chunk.text,
    dense_embedding: embedded.embeddings[i],
    sparse_embedding: embedded.sparseEmbeddings?.[i],
    metadata: chunk.metadata,
  }));

  const indexResult = await executeChild(indexDocumentsWorkflow, {
    args: [{ documents, connectorId: input.connectorId }],
    workflowId: generateWorkflowId({
      type: "index",
      connectorId: input.connectorId,
      timestamp: currentTimestamp(),
    }),
  });

  state.processed = documents.length;
  state.indexed = indexResult.indexed;
  state.dataAdded = indexResult.dataAdded ?? 0;
  state.dataUpdated = indexResult.dataUpdated ?? 0;

  await storageActivities.cleanupTempFile({ path: downloadResult.localPath });

  return {
    documentId: `${input.connectorId}:${input.externalId}`,
    chunks: chunked.totalChunks,
    indexed: indexResult.success,
  };
}
