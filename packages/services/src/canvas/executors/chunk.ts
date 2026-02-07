import { chunkDocument, type TextChunk } from "@openplane/ai";
import { ChunkNodeConfigSchema } from "@openplane/types/canvas";
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

type ChunkSource = {
  id: string;
  text: string;
};

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

function resolveSourceId(value: unknown, index: number): string {
  if (isRecord(value)) {
    const candidates = [
      value.id,
      value.documentId,
      value.externalId,
      value.chunkId,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }
  }
  return `doc-${index + 1}`;
}

function resolveTextFromRecord(record: Record<string, unknown>): string {
  for (const key of TEXT_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (Array.isArray(record.messages)) {
    const lines = record.messages
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
      return lines.join("\n\n");
    }
  }

  if (Array.isArray(record.chunks)) {
    const chunkText = record.chunks
      .map((chunk) => {
        if (!isRecord(chunk)) {
          return "";
        }
        return typeof chunk.content === "string" ? chunk.content.trim() : "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (chunkText) {
      return chunkText;
    }
  }

  return "";
}

function resolveChunkSources(input: unknown): ChunkSource[] {
  const sources: ChunkSource[] = [];

  const appendSource = (value: unknown, index: number) => {
    if (value === null || value === undefined) {
      return;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      const text = normalizeText(value);
      if (text) {
        sources.push({ id: resolveSourceId(value, index), text });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, entryIndex) => {
        appendSource(entry, entryIndex);
      });
      return;
    }
    if (isRecord(value)) {
      if (Array.isArray(value.documents)) {
        value.documents.forEach((entry, entryIndex) => {
          appendSource(entry, entryIndex);
        });
        return;
      }
      if (Array.isArray(value.items)) {
        value.items.forEach((entry, entryIndex) => {
          appendSource(entry, entryIndex);
        });
        return;
      }
      const text = resolveTextFromRecord(value);
      if (text) {
        sources.push({ id: resolveSourceId(value, index), text });
        return;
      }
      if (Object.keys(value).length > 0) {
        try {
          sources.push({
            id: resolveSourceId(value, index),
            text: JSON.stringify(value),
          });
        } catch {
          sources.push({
            id: resolveSourceId(value, index),
            text: String(value),
          });
        }
      }
    }
  };

  appendSource(input, 0);
  return sources;
}

function resolveStrategy(
  strategy: "fixed" | "semantic" | "sentence" | "paragraph"
): "fixed" | "sentence" | "paragraph" | "recursive" {
  if (strategy === "semantic") {
    return "recursive";
  }
  return strategy;
}

export const chunkExecutor: CanvasNodeExecutor = ({ node, input }) => {
  const config = ChunkNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const sources = resolveChunkSources(input);
    if (sources.length === 0) {
      throw new Error("Chunk input is required");
    }

    const strategy = resolveStrategy(config.strategy);
    const chunks: TextChunk[] = [];

    for (const source of sources) {
      const docChunks = chunkDocument(source.text, source.id, {
        strategy,
        maxChunkSize: config.maxChunkSize,
        chunkOverlap: config.overlap,
        preserveParagraphs: config.preserveStructure,
      });
      chunks.push(...docChunks);
    }

    return {
      chunks,
      totalChunks: chunks.length,
      strategyUsed: config.strategy,
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
