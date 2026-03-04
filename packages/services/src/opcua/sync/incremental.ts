import type {
  OpcUaSyncBatch,
  OpcUaSyncOptions,
  OpcUaTransformContext,
} from "@openplane/types/services/connectors/opcua";
import type { GenericDocument } from "@openplane/vespa";
import type { OpcUaClient } from "../client";
import { transformNodes } from "../transformers/node";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 100;

export async function* incrementalSync(
  client: OpcUaClient,
  context: OpcUaTransformContext,
  options: OpcUaSyncOptions = {}
): AsyncGenerator<OpcUaSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    maxBrowseDepth = 5,
    rootNodeId,
    cursor,
  } = options;

  const previousNodeIds = new Set(cursor?.browsedNodeIds ?? []);

  try {
    await client.connect();

    const currentNodes = await client.browseTree({
      rootNodeId,
      maxDepth: maxBrowseDepth,
    });

    const changedNodes = currentNodes.filter(
      (node) => !previousNodeIds.has(node.nodeId)
    );

    const allNodeIds = currentNodes.map((node) => node.nodeId);

    for (let i = 0; i < changedNodes.length; i += batchSize) {
      const batch = changedNodes.slice(i, i + batchSize);
      const documents = await transformNodes(batch, context);
      const hasMore = i + batchSize < changedNodes.length;

      yield createSyncBatch(
        documents,
        {
          lastSyncTime: Date.now(),
          lastBrowseTime: Date.now(),
          browsedNodeIds: allNodeIds,
        },
        "nodes",
        hasMore
      );
    }

    if (changedNodes.length === 0) {
      yield createSyncBatch(
        [],
        {
          lastSyncTime: Date.now(),
          lastBrowseTime: Date.now(),
          browsedNodeIds: allNodeIds,
        },
        "nodes",
        false
      );
    }
  } finally {
    await client.disconnect();
  }
}
