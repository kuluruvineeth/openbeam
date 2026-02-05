import { FilterNodeConfigSchema } from "@openplane/types/canvas";
import { evaluateConditions } from "../conditions";
import { CanvasNodeExecutionError } from "../errors";
import { evaluateExpression } from "../expression";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

function assertExpression(expression: string): void {
  if (!expression.trim()) {
    throw new Error("Filter expression is required");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildExpressionContext(
  input: unknown,
  item: unknown,
  index?: number
): Record<string, unknown> {
  return index === undefined ? { input, item } : { input, item, index };
}

type FilterMatcher = (params: {
  data: unknown;
  input: unknown;
  index?: number;
}) => Promise<boolean>;

function buildMatcher(
  config: ReturnType<typeof FilterNodeConfigSchema.parse>
): FilterMatcher {
  if (config.mode === "expression") {
    assertExpression(config.expression);
    const { expression, language } = config;
    return async ({ data, input, index }) => {
      const result = await evaluateExpression({
        expression,
        language,
        data,
        context: buildExpressionContext(input, data, index),
      });
      return Boolean(result);
    };
  }

  if (config.conditions.length === 0) {
    return async () => true;
  }

  return async ({ data }) =>
    evaluateConditions(config.conditions, config.logic, data);
}

async function filterItems(params: {
  matcher: FilterMatcher;
  items: unknown[];
  input: unknown;
}): Promise<unknown[]> {
  const { matcher, items, input } = params;
  const filtered: unknown[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const matches = await matcher({ data: item, input, index });
    if (matches) {
      filtered.push(item);
    }
  }

  return filtered;
}

export const filterExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = FilterNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const matcher = buildMatcher(config);
    if (Array.isArray(input)) {
      return await filterItems({ matcher, items: input, input });
    }

    if (isRecord(input) && Array.isArray(input.items)) {
      const items = await filterItems({ matcher, items: input.items, input });
      return { ...input, items };
    }

    const matches = await matcher({ data: input, input });
    return matches ? input : null;
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
