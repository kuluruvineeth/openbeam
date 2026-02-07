import { createMemoryConsolidator, EmbeddingService } from "@openplane/ai";
import type { MemoryMetadata } from "@openplane/types/ai";
import {
  type MemoryEncoding,
  type MemoryType,
  MemoryWriteNodeConfigSchema,
} from "@openplane/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import {
  getMemoryEntry,
  resolveScopeIds,
  storeMemoryEntry,
} from "../memory-store";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const memoryConsolidator = createMemoryConsolidator();
const embeddingService = new EmbeddingService();

type ProceduralInput = {
  pattern?: string;
  trigger?: string;
  action?: string;
  successRate?: number;
  executionCount?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeContent(input: unknown, encoding: MemoryEncoding): string {
  if (encoding === "json") {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) {
        throw new Error("JSON value is required");
      }
      JSON.parse(trimmed);
      return trimmed;
    }
    if (input === undefined) {
      throw new Error("JSON value is required");
    }
    return JSON.stringify(input);
  }

  if (encoding === "text") {
    const text = toStringValue(input);
    if (!text.trim()) {
      throw new Error("Text value is required");
    }
    return text;
  }

  const text = toStringValue(input);
  if (!text.trim()) {
    throw new Error("Embedding content is required");
  }
  return text;
}

function resolveEmbeddingFromInput(input: unknown): number[] | undefined {
  if (Array.isArray(input) && input.every((v) => typeof v === "number")) {
    return input as number[];
  }
  if (isRecord(input)) {
    const candidate = input.embedding;
    if (
      Array.isArray(candidate) &&
      candidate.every((v) => typeof v === "number")
    ) {
      return candidate as number[];
    }
  }
  return;
}

async function resolveEmbedding(params: {
  input: unknown;
  content: string;
  encoding: MemoryEncoding;
  generate: boolean;
}): Promise<number[] | undefined> {
  const provided = resolveEmbeddingFromInput(params.input);
  if (provided && provided.length > 0) {
    return provided;
  }
  if (!(params.generate || params.encoding === "embedding")) {
    return;
  }
  const text = params.content.trim();
  if (!text) {
    return;
  }
  const result = await embeddingService.embed(text);
  return result.embedding;
}

function buildTags(params: {
  key: string;
  namespace?: string;
  scope: string;
  tags?: string[];
}): string[] {
  const set = new Set<string>();
  for (const tag of params.tags ?? []) {
    if (tag.trim()) {
      set.add(tag.trim());
    }
  }
  set.add(`key:${params.key}`);
  if (params.namespace?.trim()) {
    set.add(`namespace:${params.namespace.trim()}`);
  }
  set.add(`scope:${params.scope}`);
  return Array.from(set);
}

function buildMetadata(params: {
  teamId: string;
  userId?: string;
  sessionId?: string;
  agentId?: string;
  tags: string[];
}): MemoryMetadata {
  return {
    teamId: params.teamId,
    userId: params.userId,
    sessionId: params.sessionId,
    agentId: params.agentId,
    tags: params.tags,
    source: "canvas",
  };
}

function buildSemanticEntry(params: {
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  category: string;
  validUntil?: number;
}): Parameters<typeof memoryConsolidator.semantic.store>[0] {
  return {
    type: "semantic",
    content: params.content,
    embedding: params.embedding,
    timestamp: Date.now(),
    category: params.category,
    confidence: 1,
    sources: ["canvas"],
    validUntil: params.validUntil,
    metadata: params.metadata,
  };
}

function buildEpisodicEntry(params: {
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
}): Parameters<typeof memoryConsolidator.episodic.store>[0] {
  return {
    type: "episodic",
    content: params.content,
    embedding: params.embedding,
    timestamp: Date.now(),
    eventType: "tool_result",
    metadata: params.metadata,
  };
}

function resolveProceduralFields(
  input: unknown,
  key: string,
  content: string
): ProceduralInput {
  if (isRecord(input)) {
    const candidate = input as ProceduralInput;
    return {
      pattern: candidate.pattern ?? key,
      trigger: candidate.trigger ?? key,
      action: candidate.action ?? (typeof input === "string" ? input : content),
      successRate: candidate.successRate,
      executionCount: candidate.executionCount,
    };
  }
  return {
    pattern: key,
    trigger: key,
    action: typeof input === "string" ? input : content,
  };
}

function normalizeSuccessRate(value?: number): number {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isFinite(value)) {
    throw new Error("Success rate must be a number");
  }
  if (value < 0 || value > 1) {
    throw new Error("Success rate must be between 0 and 1");
  }
  return value;
}

function normalizeExecutionCount(value?: number): number {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Execution count must be a positive number");
  }
  return Math.max(1, Math.floor(value));
}

function buildProceduralEntry(params: {
  input: unknown;
  key: string;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
}): Parameters<typeof memoryConsolidator.procedural.store>[0] {
  const fields = resolveProceduralFields(
    params.input,
    params.key,
    params.content
  );
  return {
    type: "procedural",
    content: params.content,
    embedding: params.embedding,
    timestamp: Date.now(),
    pattern: fields.pattern ?? params.key,
    trigger: fields.trigger ?? params.key,
    action: fields.action ?? params.content,
    successRate: normalizeSuccessRate(fields.successRate),
    executionCount: normalizeExecutionCount(fields.executionCount),
    metadata: params.metadata,
  };
}

async function storeInConsolidator(params: {
  memoryType: MemoryType;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  category: string;
  validUntil?: number;
  input: unknown;
}): Promise<string> {
  switch (params.memoryType) {
    case "semantic":
      return await memoryConsolidator.semantic.store(
        buildSemanticEntry({
          content: params.content,
          embedding: params.embedding,
          metadata: params.metadata,
          category: params.category,
          validUntil: params.validUntil,
        })
      );
    case "episodic":
      return await memoryConsolidator.episodic.store(
        buildEpisodicEntry({
          content: params.content,
          embedding: params.embedding,
          metadata: params.metadata,
        })
      );
    case "procedural":
      return await memoryConsolidator.procedural.store(
        buildProceduralEntry({
          input: params.input,
          key: params.category,
          content: params.content,
          embedding: params.embedding,
          metadata: params.metadata,
        })
      );
    default:
      throw new Error("Unsupported memory type");
  }
}

async function deleteFromConsolidator(params: {
  memoryType: MemoryType;
  memoryId?: string;
}): Promise<void> {
  if (!params.memoryId) {
    return;
  }
  switch (params.memoryType) {
    case "semantic":
      await memoryConsolidator.semantic.delete(params.memoryId);
      return;
    case "episodic":
      await memoryConsolidator.episodic.delete(params.memoryId);
      return;
    case "procedural":
      await memoryConsolidator.procedural.delete(params.memoryId);
      return;
    default:
      throw new Error("Unsupported memory type");
  }
}

export const memoryWriteExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  let config: ReturnType<typeof MemoryWriteNodeConfigSchema.parse> | null =
    null;
  try {
    config = MemoryWriteNodeConfigSchema.parse(resolveNodeConfig(node.data));
    const key = config.key?.trim();
    if (!key) {
      throw new Error("Memory key is required");
    }
    if (!context) {
      throw new Error("Execution context is required");
    }
    if (input === undefined) {
      throw new Error("Memory value is required");
    }

    const existing = getMemoryEntry({
      scope: config.scope,
      key,
      namespace: config.namespace,
      context,
    });

    if (existing && !config.overwrite) {
      return {
        stored: false,
        key,
        namespace: config.namespace,
        scope: config.scope,
        memoryType: config.memoryType,
        encoding: config.encoding,
        memoryId: existing.memoryId,
      };
    }

    if (existing) {
      await deleteFromConsolidator({
        memoryType: existing.memoryType,
        memoryId: existing.memoryId,
      });
    }

    const content = normalizeContent(input, config.encoding);
    const embedding = await resolveEmbedding({
      input,
      content,
      encoding: config.encoding,
      generate: config.generateEmbedding,
    });
    const expiresAt =
      config.ttlMs && config.ttlMs > 0 ? Date.now() + config.ttlMs : undefined;
    const tags = buildTags({
      key,
      namespace: config.namespace,
      scope: config.scope,
      tags: config.tags,
    });
    const scopeIds = resolveScopeIds(config.scope, context);
    const metadata = buildMetadata({
      teamId: scopeIds.teamId,
      userId: scopeIds.userId,
      sessionId: scopeIds.sessionId,
      agentId: context.agentCanvasId,
      tags,
    });
    const category = config.namespace?.trim()
      ? `${config.namespace.trim()}:${key}`
      : key;

    const memoryId = await storeInConsolidator({
      memoryType: config.memoryType,
      content,
      embedding,
      metadata,
      category,
      validUntil: expiresAt,
      input,
    });

    const stored = storeMemoryEntry({
      scope: config.scope,
      key,
      namespace: config.namespace,
      context,
      overwrite: true,
      entry: {
        memoryType: config.memoryType,
        encoding: config.encoding,
        value: input,
        content,
        embedding,
        metadata,
        tags,
        expiresAt,
        memoryId,
      },
    });

    if (!stored.stored) {
      return {
        stored: false,
        key,
        namespace: config.namespace,
        scope: config.scope,
        memoryType: config.memoryType,
        encoding: config.encoding,
        memoryId,
      };
    }

    return {
      stored: true,
      key,
      namespace: config.namespace,
      scope: config.scope,
      memoryType: config.memoryType,
      encoding: config.encoding,
      memoryId,
      expiresAt,
      tags,
    };
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
