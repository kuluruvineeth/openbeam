import {
  MITRE_ATTACK_ENTERPRISE_URL,
  MITRE_ATTACK_ICS_URL,
  MITRE_ATTACK_MOBILE_URL,
  type StixBundle,
  StixBundleSchema,
} from "@openbeam/types/services/connectors/mitre-attack";
import { logger } from "../lib/logger";
import { MitreAttackApiError } from "./types";

const DEFAULT_TIMEOUT = 60_000;

const DOMAIN_URLS: Record<string, string> = {
  enterprise: MITRE_ATTACK_ENTERPRISE_URL,
  mobile: MITRE_ATTACK_MOBILE_URL,
  ics: MITRE_ATTACK_ICS_URL,
};

export function getDomainUrl(domain: string): string {
  const url = DOMAIN_URLS[domain];
  if (!url) {
    throw new MitreAttackApiError({
      message: `Unknown ATT&CK domain: ${domain}`,
      code: "INVALID_STIX",
      retryable: false,
    });
  }
  return url;
}

export async function fetchStixBundle(url: string): Promise<StixBundle> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new MitreAttackApiError({
        message: `Request timed out fetching ${url}`,
        code: "TIMEOUT",
        retryable: true,
        cause: error,
      });
    }
    throw new MitreAttackApiError({
      message: `Failed to fetch STIX bundle from ${url}`,
      code: "FETCH_FAILED",
      retryable: true,
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new MitreAttackApiError({
      message: `HTTP ${response.status} from ${url}`,
      code: "FETCH_FAILED",
      retryable: response.status >= 500,
    });
  }

  const raw: unknown = await response.json();
  const parsed = StixBundleSchema.safeParse(raw);

  if (!parsed.success) {
    throw new MitreAttackApiError({
      message: `Invalid STIX bundle: ${parsed.error.message}`,
      code: "PARSE_ERROR",
      retryable: false,
    });
  }

  logger.info(
    { url, objectCount: parsed.data.objects.length },
    "MITRE ATT&CK STIX bundle fetched"
  );

  return parsed.data;
}
