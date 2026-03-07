import { TransformNodeConfigSchema } from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { evaluateExpression } from "../expression";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

function assertExpression(expression: string): void {
  if (!expression.trim()) {
    throw new Error("Transform expression is required");
  }
}

export const transformExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  const config = TransformNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const expression = config.expression.trim();
    assertExpression(expression);

    return await evaluateExpression({
      expression,
      language: config.language,
      data: input,
      context: context ? { execution: context } : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
