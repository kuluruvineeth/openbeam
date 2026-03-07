import type { CanvasNodeType } from "@openbeam/types/canvas";

export class CanvasNodeExecutionError extends Error {
  readonly nodeType: CanvasNodeType;
  readonly nodeId: string;

  constructor(params: {
    nodeType: CanvasNodeType;
    nodeId: string;
    message: string;
    cause?: unknown;
  }) {
    super(params.message, params.cause ? { cause: params.cause } : undefined);
    this.nodeType = params.nodeType;
    this.nodeId = params.nodeId;
    this.name = "CanvasNodeExecutionError";
  }
}

export class CanvasNodeExecutorNotFoundError extends Error {
  readonly nodeType: CanvasNodeType;

  constructor(nodeType: CanvasNodeType) {
    super(`Unsupported node type: ${nodeType}`);
    this.nodeType = nodeType;
    this.name = "CanvasNodeExecutorNotFoundError";
  }
}
