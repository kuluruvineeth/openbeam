import type {
  NodeRedFlow,
  NodeRedNode,
  NodeRedSyncBatch,
  NodeRedSyncCursor,
  NodeRedTransformContext,
} from "@openplane/types/services/connectors/nodered";
import type { GenericDocument } from "@openplane/vespa";
import type { NodeRedClient } from "../client";
import { transformFlows } from "../transformers/flow";
import { transformNodeTypes } from "../transformers/node-type";
import { createSyncBatch } from "./utils";

interface IncrementalSyncOptions {
  cursor?: NodeRedSyncCursor;
  syncNodes?: boolean;
}

export async function* incrementalSync(
  client: NodeRedClient,
  context: NodeRedTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<NodeRedSyncBatch<GenericDocument>, void, undefined> {
  const { syncNodes = true } = options;

  const allEntries = await client.getFlows();

  const flows = allEntries.filter(
    (entry): entry is NodeRedFlow => entry.type === "tab"
  );
  const nodes = allEntries.filter(
    (entry): entry is NodeRedNode =>
      entry.type !== "tab" && entry.type !== "subflow" && "z" in entry
  );

  if (flows.length > 0) {
    const flowDocs = await transformFlows(flows, context, nodes);
    yield createSyncBatch(
      flowDocs,
      { lastSyncTime: Date.now() },
      "flows",
      syncNodes
    );
  }

  if (syncNodes) {
    const nodeTypes = await client.getNodes();

    if (nodeTypes.length > 0) {
      const nodeTypeDocs = await transformNodeTypes(nodeTypes, context);
      yield createSyncBatch(
        nodeTypeDocs,
        { lastSyncTime: Date.now() },
        "node_types",
        false
      );
    }
  }
}
