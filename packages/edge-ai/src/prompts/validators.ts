import type { NEREntity, QueryClassification } from "@openbeam/types/edge/ai";
import {
  NEREntitySchema,
  QueryClassificationSchema,
} from "@openbeam/types/edge/ai";

const JSON_ARRAY_RE = /\[[\s\S]*\]/;
const JSON_OBJECT_RE = /\{[\s\S]*\}/;

function extractJsonArray(raw: string): string | null {
  const match = raw.match(JSON_ARRAY_RE);
  return match ? match[0] : null;
}

function extractJsonObject(raw: string): string | null {
  const match = raw.match(JSON_OBJECT_RE);
  return match ? match[0] : null;
}

function clampConfidence(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 0;
  }
  return Math.max(0, Math.min(1, num));
}

export function parseNERResponse(raw: string): NEREntity[] {
  const jsonStr = extractJsonArray(raw);
  if (!jsonStr) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const entities: NEREntity[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const candidate = {
      ...(item as Record<string, unknown>),
      confidence: clampConfidence((item as Record<string, unknown>).confidence),
    };

    const result = NEREntitySchema.safeParse(candidate);
    if (result.success) {
      entities.push(result.data);
    }
  }

  return entities;
}

export function parseQueryClassification(
  raw: string
): QueryClassification | null {
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  const candidate = {
    ...record,
    confidence: clampConfidence(record.confidence),
    entities: Array.isArray(record.entities)
      ? record.entities.map((e: unknown) => {
          if (typeof e !== "object" || e === null) {
            return e;
          }
          return {
            ...(e as Record<string, unknown>),
            confidence: clampConfidence(
              (e as Record<string, unknown>).confidence
            ),
          };
        })
      : [],
  };

  const result = QueryClassificationSchema.safeParse(candidate);
  return result.success ? result.data : null;
}
