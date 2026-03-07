import {
  type MemoryEncoding,
  MemoryReadNodeConfigSchema,
} from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { getMemoryEntry } from "../memory-store";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

function parseJsonValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function resolveEntryValue(params: {
  encoding: MemoryEncoding;
  value: unknown;
  embedding?: number[];
  content: string;
}): unknown {
  if (params.encoding === "embedding") {
    if (params.embedding && params.embedding.length > 0) {
      return params.embedding;
    }
    if (Array.isArray(params.value)) {
      return params.value;
    }
    return params.value ?? params.content;
  }

  if (params.encoding === "json") {
    if (typeof params.value === "string") {
      return parseJsonValue(params.value);
    }
    if (params.value !== undefined) {
      return params.value;
    }
    return parseJsonValue(params.content);
  }

  return params.value ?? params.content;
}

function buildMissingOutput(params: {
  includeMetadata: boolean;
  value: unknown;
  key: string;
  namespace?: string;
  scope: string;
}): unknown {
  if (!params.includeMetadata) {
    return params.value ?? null;
  }
  return {
    found: false,
    value: params.value ?? null,
    entry: null,
    key: params.key,
    namespace: params.namespace,
    scope: params.scope,
  };
}

function buildEntryOutput(params: {
  includeMetadata: boolean;
  value: unknown;
  entry: ReturnType<typeof getMemoryEntry> extends infer E ? E : never;
}): unknown {
  if (!params.includeMetadata) {
    return params.value;
  }
  if (!params.entry) {
    return {
      found: false,
      value: params.value ?? null,
      entry: null,
    };
  }
  return {
    found: true,
    value: params.value,
    entry: {
      key: params.entry.key,
      namespace: params.entry.namespace,
      scope: params.entry.scope,
      memoryType: params.entry.memoryType,
      encoding: params.entry.encoding,
      content: params.entry.content,
      embedding: params.entry.embedding,
      metadata: params.entry.metadata,
      tags: params.entry.tags,
      createdAt: params.entry.createdAt,
      expiresAt: params.entry.expiresAt,
      memoryId: params.entry.memoryId,
    },
  };
}

export const memoryReadExecutor: CanvasNodeExecutor = ({
  node,
  input,
  context,
}) => {
  try {
    const config = MemoryReadNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const key = config.key?.trim();
    if (!key) {
      throw new Error("Memory key is required");
    }
    if (!context) {
      throw new Error("Execution context is required");
    }

    const entry = getMemoryEntry({
      scope: config.scope,
      key,
      namespace: config.namespace,
      context,
    });

    if (!entry) {
      if (config.throwOnMissing) {
        throw new Error("Memory entry not found");
      }
      return buildMissingOutput({
        includeMetadata: config.includeMetadata,
        value: config.defaultValue ?? input ?? null,
        key,
        namespace: config.namespace,
        scope: config.scope,
      });
    }

    const value = resolveEntryValue({
      encoding: entry.encoding,
      value: entry.value,
      embedding: entry.embedding,
      content: entry.content,
    });

    return buildEntryOutput({
      includeMetadata: config.includeMetadata,
      value,
      entry,
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
