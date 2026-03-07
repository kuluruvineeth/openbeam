import { EmbeddingService } from "@openbeam/ai";
import {
  type Embedding,
  type EmbeddingModel,
  getEmbeddingModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openbeam/types/ai";
import { EmbeddingsNodeConfigSchema } from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const TEXT_KEYS = [
  "text",
  "content",
  "input",
  "prompt",
  "message",
  "summary",
  "body",
  "output",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function collectFromArray(items: unknown[], output: string[]): void {
  for (const item of items) {
    collectTexts(item, output);
  }
}

function collectFromMessages(messages: unknown[], output: string[]): void {
  const lines = messages
    .map((message) => {
      if (!isRecord(message)) {
        return "";
      }
      const role =
        typeof message.role === "string" ? message.role.trim() : "speaker";
      const content =
        typeof message.content === "string" ? message.content.trim() : "";
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean);

  if (lines.length > 0) {
    output.push(lines.join("\n\n"));
  }
}

function collectTexts(value: unknown, output: string[]): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    const normalized = normalizeText(value);
    if (normalized) {
      output.push(normalized);
    }
    return;
  }

  if (typeof value === "boolean") {
    output.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    collectFromArray(value, output);
    return;
  }

  if (!isRecord(value)) {
    const normalized = normalizeText(value);
    if (normalized) {
      output.push(normalized);
    }
    return;
  }

  if (Array.isArray(value.texts)) {
    collectFromArray(value.texts, output);
  }

  if (Array.isArray(value.items)) {
    collectFromArray(value.items, output);
  }

  if (Array.isArray(value.messages)) {
    collectFromMessages(value.messages, output);
  }

  for (const key of TEXT_KEYS) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      output.push(candidate.trim());
      return;
    }
  }

  if (Object.keys(value).length > 0) {
    try {
      output.push(JSON.stringify(value));
    } catch {
      output.push(String(value));
    }
  }
}

function resolveTexts(input: unknown): string[] {
  const output: string[] = [];
  collectTexts(input, output);
  return output.map((text) => text.trim()).filter(Boolean);
}

function resolveModel(model?: string): {
  providerId?: ProviderId;
  modelId?: string;
  definition?: EmbeddingModel;
} {
  if (!model?.trim()) {
    return {};
  }
  const trimmed = model.trim();
  const prefixEnd = trimmed.indexOf(":");
  if (prefixEnd > 0) {
    const prefix = trimmed.slice(0, prefixEnd);
    const candidate = trimmed.slice(prefixEnd + 1);
    const provider = ProviderIdSchema.safeParse(prefix);
    if (provider.success) {
      return {
        providerId: provider.data,
        modelId: candidate || undefined,
        definition: candidate ? getEmbeddingModel(candidate) : undefined,
      };
    }
  }
  const known = getEmbeddingModel(trimmed);
  return { providerId: known?.provider, modelId: trimmed, definition: known };
}

function normalizeEmbedding(embedding: Embedding): Embedding {
  let sum = 0;
  for (const value of embedding) {
    sum += value * value;
  }
  const norm = Math.sqrt(sum);
  if (!Number.isFinite(norm) || norm === 0) {
    return embedding;
  }
  return embedding.map((value) => value / norm);
}

function normalizeEmbeddings(
  embeddings: Embedding[],
  enabled: boolean
): Embedding[] {
  if (!enabled) {
    return embeddings;
  }
  return embeddings.map((embedding) => normalizeEmbedding(embedding));
}

function validateDimensions(
  embeddings: Embedding[],
  expectedDimensions?: number
): void {
  if (!expectedDimensions) {
    return;
  }
  for (const embedding of embeddings) {
    if (embedding.length !== expectedDimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}`
      );
    }
  }
}

export const embeddingsExecutor: CanvasNodeExecutor = async ({
  node,
  input,
}) => {
  const config = EmbeddingsNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const texts = resolveTexts(input);
    if (texts.length === 0) {
      throw new Error("Embeddings input is required");
    }

    const model = resolveModel(config.model);
    if (
      config.dimensions &&
      model.definition &&
      model.definition.dimensions !== config.dimensions
    ) {
      throw new Error(
        `Embedding dimensions ${config.dimensions} do not match model ${model.definition.id} (${model.definition.dimensions})`
      );
    }

    const service = new EmbeddingService({
      providerId: model.providerId,
      modelId: model.modelId,
      batchSize: config.batchSize,
    });

    if (texts.length === 1) {
      const result = await service.embed(texts[0] ?? "");
      const embeddings = normalizeEmbeddings(
        [result.embedding],
        config.normalize
      );
      validateDimensions(embeddings, config.dimensions);
      return {
        ...result,
        embedding: embeddings[0] ?? result.embedding,
      };
    }

    const batch = await service.embedBatch(texts);
    const normalized = normalizeEmbeddings(batch.embeddings, config.normalize);
    validateDimensions(normalized, config.dimensions);
    return {
      ...batch,
      embeddings: normalized,
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
