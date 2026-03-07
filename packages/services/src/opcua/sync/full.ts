import type {
  OpcUaSyncBatch,
  OpcUaSyncOptions,
  OpcUaTransformContext,
} from "@openbeam/types/services/connectors/opcua";
import type { GenericDocument } from "@openbeam/vespa";
import type { OpcUaClient } from "../client";
import { transformNodes } from "../transformers/node";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 100;

export async function* fullSync(
  client: OpcUaClient,
  context: OpcUaTransformContext,
  options: OpcUaSyncOptions = {}
): AsyncGenerator<OpcUaSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    maxBrowseDepth = 5,
    rootNodeId,
  } = options;

  try {
    await client.connect();

    const nodes = await client.browseTree({
      rootNodeId,
      maxDepth: maxBrowseDepth,
    });

    const allNodeIds: string[] = [];

    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      const documents = await transformNodes(batch, context);

      for (const node of batch) {
        allNodeIds.push(node.nodeId);
      }

      const hasMore = i + batchSize < nodes.length;

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
  } finally {
    await client.disconnect();
  }
}
