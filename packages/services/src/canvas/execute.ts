import type { CanvasNodeType } from "@openbeam/types/canvas";
import { registerDefaultCanvasNodeExecutors } from "./defaults";
import { CanvasNodeExecutorNotFoundError } from "./errors";
import { getCanvasNodeExecutor } from "./registry";
import type { CanvasNodeExecutionInput } from "./types";

const CONTEXT_REQUIRED_NODES = new Set<CanvasNodeType>([
  "connector",
  "connector_action",
  "tool",
  "rag",
  "database_query",
  "graphql_query",
  "http_request",
]);

function requiresContext(nodeType: CanvasNodeType): boolean {
  return CONTEXT_REQUIRED_NODES.has(nodeType);
}

export async function executeCanvasNode(
  params: CanvasNodeExecutionInput
): Promise<unknown> {
  registerDefaultCanvasNodeExecutors();

  if (requiresContext(params.node.type) && !params.context) {
    throw new Error(
      `Node type "${params.node.type}" requires execution context`
    );
  }

  const executor = getCanvasNodeExecutor(params.node.type);

  if (!executor) {
    throw new CanvasNodeExecutorNotFoundError(params.node.type);
  }

  return await executor(params);
}
