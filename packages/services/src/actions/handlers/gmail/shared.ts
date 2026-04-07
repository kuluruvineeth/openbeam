import type { GmailClient } from "../../../gmail/client";
import { extractEmailAddress } from "../../../gmail/utils/content-extractor";
import { ActionExecutorError } from "../../errors";
import type { ActionExecutionResult } from "../../types";

export const HTML_TAG = /<[^>]+>/;
export const FORWARD_PREFIX = /^fwd:/i;
export const DEFAULT_SEARCH_LIMIT = 50;
export const MAX_SEARCH_LIMIT = 500;
export const HTML_DELIMITER = "<br/><br/>--- Forwarded message ---<br/><br/>";
export const PLAIN_DELIMITER = "\n\n--- Forwarded message ---\n\n";

export type GmailHandlerContext = {
  client: GmailClient;
  params: Record<string, unknown>;
  userEmail: string | undefined;
};

export type GmailHandler = (
  context: GmailHandlerContext
) => Promise<ActionExecutionResult>;

export function looksLikeHtml(value: string): boolean {
  return HTML_TAG.test(value);
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeEmailList(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    for (const raw of toStringArray(value)) {
      const email = extractEmailAddress(raw) ?? raw.trim();
      if (!email) {
        continue;
      }
      const key = email.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(email);
    }
  }
  return result;
}

export function failure(error: string | undefined): ActionExecutionResult {
  return { success: false, data: {}, error };
}

export function notFound(message: string): ActionExecutorError {
  return new ActionExecutorError({
    code: "GMAIL_NOT_FOUND",
    message,
    retryable: false,
    statusCode: 404,
  });
}
