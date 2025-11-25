import type { Database } from "../index";
import type { ApiKeyType } from "../queries/api-keys";

// === API Key Mutation Types ===

export interface CreateApiKeyInput {
  teamId: string;
  name: string;
  description?: string | null;
  keyPrefix: string;
  keyHash: string;
  type: ApiKeyType;
  scopes: string[];
  expiresAt?: Date | null;
  allowedIps?: string[];
  allowedDomains?: string[];
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  createdBy: string;
}

export interface UpdateApiKeyInput {
  name?: string;
  description?: string | null;
  scopes?: string[];
  allowedIps?: string[];
  allowedDomains?: string[];
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
}

// === API Key Mutations ===

/**
 * Create an API key
 */
export const createApiKey = async (
  db: Database,
  input: CreateApiKeyInput
): Promise<string> => {
  const apiKey = await db.apiKey.create({
    data: {
      teamId: input.teamId,
      name: input.name,
      description: input.description,
      keyPrefix: input.keyPrefix,
      keyHash: input.keyHash,
      type: input.type,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
      allowedIps: input.allowedIps || [],
      allowedDomains: input.allowedDomains || [],
      rateLimit: input.rateLimit || {},
      createdBy: input.createdBy,
    },
  });

  return apiKey.id;
};

/**
 * Update an API key
 */
export const updateApiKey = async (
  db: Database,
  keyId: string,
  teamId: string,
  input: UpdateApiKeyInput
): Promise<boolean> => {
  const result = await db.apiKey.updateMany({
    where: { id: keyId, teamId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.scopes !== undefined && { scopes: input.scopes }),
      ...(input.allowedIps !== undefined && { allowedIps: input.allowedIps }),
      ...(input.allowedDomains !== undefined && {
        allowedDomains: input.allowedDomains,
      }),
      ...(input.rateLimit !== undefined && { rateLimit: input.rateLimit }),
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Revoke (deactivate) an API key
 */
export const revokeApiKey = async (
  db: Database,
  keyId: string,
  teamId: string
): Promise<boolean> => {
  const result = await db.apiKey.updateMany({
    where: { id: keyId, teamId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Reactivate an API key
 */
export const reactivateApiKey = async (
  db: Database,
  keyId: string,
  teamId: string
): Promise<boolean> => {
  const result = await db.apiKey.updateMany({
    where: { id: keyId, teamId },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Delete an API key permanently
 */
export const deleteApiKey = async (
  db: Database,
  keyId: string,
  teamId: string
): Promise<boolean> => {
  const result = await db.apiKey.deleteMany({
    where: { id: keyId, teamId },
  });

  return result.count > 0;
};

/**
 * Rotate an API key (create new, deactivate old)
 */
export const rotateApiKey = async (
  db: Database,
  oldKeyId: string,
  teamId: string,
  newKeyPrefix: string,
  newKeyHash: string
): Promise<string | null> => {
  // Get the old key
  const oldKey = await db.apiKey.findFirst({
    where: { id: oldKeyId, teamId },
  });

  if (!oldKey) {
    return null;
  }

  // Create new key and deactivate old in transaction
  const [newKey] = await db.$transaction([
    db.apiKey.create({
      data: {
        teamId: oldKey.teamId,
        name: oldKey.name,
        description: oldKey.description,
        keyPrefix: newKeyPrefix,
        keyHash: newKeyHash,
        type: oldKey.type,
        scopes: oldKey.scopes,
        expiresAt: oldKey.expiresAt,
        allowedIps: oldKey.allowedIps,
        allowedDomains: oldKey.allowedDomains,
        rateLimit: oldKey.rateLimit,
        createdBy: oldKey.createdBy,
      },
    }),
    db.apiKey.update({
      where: { id: oldKeyId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    }),
  ]);

  return newKey.id;
};

/**
 * Update last used timestamp
 */
export const updateApiKeyLastUsed = async (
  db: Database,
  keyId: string
): Promise<void> => {
  await db.apiKey.update({
    where: { id: keyId },
    data: {
      lastUsedAt: new Date(),
    },
  });
};

/**
 * Delete expired API keys
 */
export const deleteExpiredApiKeys = async (
  db: Database,
  options: { olderThanDays?: number } = {}
): Promise<number> => {
  const { olderThanDays = 30 } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db.apiKey.deleteMany({
    where: {
      isActive: false,
      expiresAt: { lt: cutoffDate },
    },
  });

  return result.count;
};

/**
 * Bulk revoke API keys
 */
export const bulkRevokeApiKeys = async (
  db: Database,
  keyIds: string[],
  teamId: string
): Promise<number> => {
  const result = await db.apiKey.updateMany({
    where: {
      id: { in: keyIds },
      teamId,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  return result.count;
};

/**
 * Update API key scopes
 */
export const updateApiKeyScopes = async (
  db: Database,
  keyId: string,
  teamId: string,
  scopes: string[]
): Promise<boolean> => {
  const result = await db.apiKey.updateMany({
    where: { id: keyId, teamId },
    data: {
      scopes,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Update API key rate limits
 */
export const updateApiKeyRateLimit = async (
  db: Database,
  keyId: string,
  teamId: string,
  rateLimit: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  }
): Promise<boolean> => {
  const result = await db.apiKey.updateMany({
    where: { id: keyId, teamId },
    data: {
      rateLimit,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};
