import { createHash } from "node:crypto";
import type { DedupConfig } from "@openbeam/types/services/connectors/custom-webhook";
import { resolveJsonPath } from "./transform";

const DEFAULT_TTL_SECONDS = 86_400;

export function extractEventId(
  rawBody: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  config?: DedupConfig
): string {
  if (config?.idHeader) {
    const headerValue = headers[config.idHeader.toLowerCase()];
    if (headerValue) {
      return headerValue;
    }
  }

  if (config?.idPath) {
    const value = resolveJsonPath(payload, config.idPath);
    if (value !== null && value !== undefined) {
      return String(value);
    }
  }

  return createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
}

export function getDedupTtl(config?: DedupConfig): number {
  return config?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
}
