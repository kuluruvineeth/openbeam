import { createHash, timingSafeEqual } from "node:crypto";
import prisma, { findApiKeyByPrefix, updateApiKeyLastUsed } from "@openbeam/db";
import argon2 from "argon2";
import type { AuthContext } from "@/types/auth";
import logger from "@/utils/logger";

const API_KEY_PREFIX = process.env.API_KEY_PREFIX ?? "op_live_";
const LOOKUP_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;

export function extractApiKey(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const key = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!key.startsWith("op_")) {
    return null;
  }

  return key;
}

function verifyLegacyHash(key: string, hash: string): boolean {
  const digest = createHash("sha256").update(key).digest("hex");

  if (digest.length !== hash.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hash));
  } catch {
    return false;
  }
}

async function verifyApiKeyHash(key: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    try {
      return await argon2.verify(hash, key);
    } catch {
      return false;
    }
  }

  return verifyLegacyHash(key, hash);
}

export async function verifyApiKey(
  apiKey: string
): Promise<AuthContext | null> {
  try {
    const prefix = apiKey.slice(0, LOOKUP_PREFIX_LENGTH);
    const apiKeyRecord = await findApiKeyByPrefix(prisma, prefix);

    if (!apiKeyRecord) {
      return null;
    }

    const isValid = await verifyApiKeyHash(apiKey, apiKeyRecord.keyHash);
    if (!isValid) {
      return null;
    }

    updateApiKeyLastUsed(prisma, apiKeyRecord.id).catch(() => {
      // Ignore update errors (non-critical)
    });

    return {
      type: "apiKey",
      apiKeyId: apiKeyRecord.id,
      teamId: apiKeyRecord.teamId,
      scopes: apiKeyRecord.scopes,
    };
  } catch (error) {
    logger.error({ error }, "API key verification error");
    return null;
  }
}

const VALID_SCOPE_PATTERN = /^[a-z]+:[a-z*]+$/;

export function validateScopes(scopes: string[]): boolean {
  return scopes.every((scope) => VALID_SCOPE_PATTERN.test(scope));
}
