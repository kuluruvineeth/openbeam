import { MergeNodeConfigSchema } from "@openplane/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const TEXT_KEYS = [
  "text",
  "content",
  "summary",
  "output",
  "answer",
  "message",
  "prompt",
  "body",
  "input",
];
const ARRAY_KEYS = [
  "items",
  "documents",
  "results",
  "chunks",
  "responses",
  "texts",
];
const NON_WORD = /[^\w\s]+/g;
const MULTI_SPACE = /\s+/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePrimitive(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function resolveMessageText(messages: unknown): string {
  if (!Array.isArray(messages)) {
    return "";
  }
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
  return lines.join("\n\n");
}

function normalizeSegments(segments: string[]): string[] {
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

function extractSegments(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  const primitive = normalizePrimitive(value);
  if (primitive) {
    return [primitive];
  }

  if (Array.isArray(value)) {
    return normalizeSegments(value.flatMap((entry) => extractSegments(entry)));
  }

  if (!isRecord(value)) {
    try {
      return [JSON.stringify(value)];
    } catch {
      return [String(value)];
    }
  }

  const segments: string[] = [];

  for (const key of ARRAY_KEYS) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      segments.push(...candidate.flatMap((entry) => extractSegments(entry)));
    }
  }

  const messageText = resolveMessageText(value.messages);
  if (messageText) {
    segments.push(messageText);
  }

  for (const key of TEXT_KEYS) {
    const candidate = value[key];
    const direct = normalizePrimitive(candidate);
    if (direct) {
      segments.push(direct);
    }
  }

  if (segments.length > 0) {
    return normalizeSegments(segments);
  }

  return normalizeSegments(
    Object.values(value).flatMap((entry) => extractSegments(entry))
  );
}

function resolveGroups(input: unknown): string[][] {
  if (Array.isArray(input)) {
    return input
      .map((entry) => normalizeSegments(extractSegments(entry)))
      .filter((group) => group.length > 0);
  }

  if (isRecord(input)) {
    for (const key of ARRAY_KEYS) {
      const candidate = input[key];
      if (Array.isArray(candidate)) {
        return candidate
          .map((entry) => normalizeSegments(extractSegments(entry)))
          .filter((group) => group.length > 0);
      }
    }
    const values = Object.values(input);
    if (values.length > 0) {
      return values
        .map((entry) => normalizeSegments(extractSegments(entry)))
        .filter((group) => group.length > 0);
    }
  }

  const segments = normalizeSegments(extractSegments(input));
  return segments.length > 0 ? [segments] : [];
}

function interleaveGroups(groups: string[][]): string[] {
  const result: string[] = [];
  let index = 0;
  let added = true;

  while (added) {
    added = false;
    for (const group of groups) {
      if (index < group.length) {
        const value = group[index];
        if (value !== undefined) {
          result.push(value);
        }
        added = true;
      }
    }
    index += 1;
  }

  return result;
}

function normalizeTokens(value: string): string {
  return value.toLowerCase().replace(NON_WORD, " ").replace(MULTI_SPACE, " ");
}

function buildTokenSet(value: string): Set<string> {
  const normalized = normalizeTokens(value).trim();
  if (!normalized) {
    return new Set();
  }
  return new Set(normalized.split(" "));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function dedupeSegments(segments: string[], threshold: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const tokenCache = new Map<string, Set<string>>();
  const normalizedThreshold = Math.min(Math.max(threshold, 0), 1);
  const useFuzzy = normalizedThreshold < 1;

  const getTokens = (segment: string): Set<string> => {
    const cached = tokenCache.get(segment);
    if (cached) {
      return cached;
    }
    const tokens = buildTokenSet(segment);
    tokenCache.set(segment, tokens);
    return tokens;
  };

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    if (useFuzzy && result.length > 0) {
      const tokens = getTokens(trimmed);
      const isDuplicate = result.some(
        (existing) =>
          jaccardSimilarity(tokens, getTokens(existing)) >= normalizedThreshold
      );
      if (isDuplicate) {
        continue;
      }
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function applyMaxLength(params: {
  parts: string[];
  separator: string;
  maxLength?: number;
}): { text: string; parts: string[] } {
  const { parts, separator, maxLength } = params;
  if (!maxLength || maxLength <= 0) {
    return { text: parts.join(separator), parts };
  }
  const limited: string[] = [];
  let length = 0;

  for (const part of parts) {
    const nextLength =
      length + (limited.length > 0 ? separator.length : 0) + part.length;
    if (nextLength > maxLength) {
      if (limited.length === 0) {
        limited.push(part.slice(0, maxLength));
      }
      break;
    }
    limited.push(part);
    length = nextLength;
  }

  return { text: limited.join(separator), parts: limited };
}

export const mergeExecutor: CanvasNodeExecutor = ({ node, input }) => {
  const config = MergeNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    let segments: string[] = [];

    if (config.strategy === "interleave") {
      const groups = resolveGroups(input);
      segments = interleaveGroups(groups);
    } else {
      segments = normalizeSegments(extractSegments(input));
      if (config.strategy === "deduplicate") {
        segments = dedupeSegments(segments, config.dedupeThreshold);
      }
    }

    if (segments.length === 0) {
      throw new Error("Merge input is required");
    }

    const merged = applyMaxLength({
      parts: segments,
      separator: config.separator,
      maxLength: config.maxLength,
    });

    return {
      text: merged.text,
      parts: merged.parts,
      totalParts: merged.parts.length,
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
