import {
  CISA_KEV_FEED_URL,
  CISA_KEV_GITHUB_URL,
  type CisaKevCatalog,
  CisaKevCatalogSchema,
} from "@openbeam/types/services/connectors/cisa-kev";
import { logger } from "../lib/logger";
import { CisaKevApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;

async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFromUrl(url: string): Promise<unknown> {
  const response = await fetchWithTimeout(url, DEFAULT_TIMEOUT);

  if (!response.ok) {
    throw new CisaKevApiError({
      message: `HTTP ${response.status} from ${url}`,
      code: "FETCH_FAILED",
      retryable: response.status >= 500,
    });
  }

  return response.json();
}

export async function fetchKevCatalog(): Promise<CisaKevCatalog> {
  let raw: unknown;

  try {
    raw = await fetchFromUrl(CISA_KEV_FEED_URL);
  } catch (primaryError) {
    logger.warn(
      { error: primaryError },
      "CISA KEV primary feed failed, trying GitHub fallback"
    );

    try {
      raw = await fetchFromUrl(CISA_KEV_GITHUB_URL);
    } catch (fallbackError) {
      throw new CisaKevApiError({
        message: "Both CISA KEV feed URLs failed",
        code: "FETCH_FAILED",
        retryable: true,
        cause: fallbackError,
      });
    }
  }

  const parsed = CisaKevCatalogSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CisaKevApiError({
      message: `Invalid catalog JSON: ${parsed.error.message}`,
      code: "PARSE_ERROR",
      retryable: false,
    });
  }

  logger.info(
    { version: parsed.data.catalogVersion, count: parsed.data.count },
    "CISA KEV catalog fetched"
  );

  return parsed.data;
}
