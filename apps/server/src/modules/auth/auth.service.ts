/**
 * Authentication Service
 * Handles API key verification and authentication logic
 */

import { createHash, timingSafeEqual } from "node:crypto";
import prisma from "@openplane/db";
import argon2 from "argon2";
import type { AuthContext } from "@/types/auth";

const API_KEY_PREFIX = process.env.API_KEY_PREFIX ?? "op_live_";
const LOOKUP_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;

/**
 * Extract API key from Authorization header
 * Supports: "Bearer op_xxx" or "op_xxx" format
 */
export function extractApiKey(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Remove "Bearer " prefix if present
  const key = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  // API keys should start with "op_" prefix
  if (!key.startsWith("op_")) {
    return null;
  }

  return key;
}

/**
 * Verify API key using timing-safe comparison (legacy SHA256)
 */
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

/**
 * Verify API key hash (supports both Argon2 and legacy SHA256)
 */
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

/**
 * Verify API key and return auth context
 */
export async function verifyApiKey(
  apiKey: string
): Promise<AuthContext | null> {
  try {
    // Extract prefix for fast lookup
    const prefix = apiKey.slice(0, LOOKUP_PREFIX_LENGTH);

    // Find API key by prefix
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        prefix,
        revoked: false,
        OR: [
          { expiresAt: null },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
      select: {
        id: true,
        keyHash: true,
        teamId: true,
        scopes: true,
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Verify the full key hash
    const isValid = await verifyApiKeyHash(apiKey, apiKeyRecord.keyHash);
    if (!isValid) {
      return null;
    }

    // Update last used timestamp (non-blocking)
    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore update errors (non-critical)
      });

    // Return auth context
    return {
      type: "apiKey",
      apiKeyId: apiKeyRecord.id,
      teamId: apiKeyRecord.teamId,
      scopes: apiKeyRecord.scopes,
    };
  } catch (error) {
    console.error("API key verification error:", error);
    return null;
  }
}

// Define valid scope pattern at module level for performance
const VALID_SCOPE_PATTERN = /^[a-z]+:[a-z*]+$/;

/**
 * Validate scopes format
 */
export function validateScopes(scopes: string[]): boolean {
  return scopes.every((scope) => VALID_SCOPE_PATTERN.test(scope));
}
