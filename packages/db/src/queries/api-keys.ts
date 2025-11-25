import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === API Key Query Types ===

export type ApiKeyType =
  | "STANDARD"
  | "RESTRICTED"
  | "ADMIN"
  | "SERVICE"
  | "WEBHOOK"
  | "EMBED";

export interface ApiKeyResult {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  type: ApiKeyType;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  allowedIps: string[];
  allowedDomains: string[];
  rateLimit: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyWithHash extends ApiKeyResult {
  keyHash: string;
}

export interface ApiKeyUsageResult {
  keyId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  requestsByEndpoint: Array<{ endpoint: string; count: number }>;
  requestsOverTime: Array<{ timestamp: string; count: number }>;
}

// === API Key Queries ===

/**
 * Get API key by ID
 */
export const getApiKeyById = async (
  db: Database,
  keyId: string
): Promise<ApiKeyResult | null> => {
  const key = await db.apiKey.findUnique({
    where: { id: keyId },
  });

  if (!key) {
    return null;
  }

  return mapApiKey(key);
};

/**
 * Get API key by ID with hash (for validation)
 */
export const getApiKeyWithHash = async (
  db: Database,
  keyId: string
): Promise<ApiKeyWithHash | null> => {
  const key = await db.apiKey.findUnique({
    where: { id: keyId },
  });

  if (!key) {
    return null;
  }

  return {
    ...mapApiKey(key),
    keyHash: key.keyHash,
  };
};

/**
 * Find API key by prefix (for lookup during validation)
 */
export const findApiKeyByPrefix = async (
  db: Database,
  prefix: string
): Promise<ApiKeyWithHash | null> => {
  const key = await db.apiKey.findFirst({
    where: { keyPrefix: prefix },
  });

  if (!key) {
    return null;
  }

  return {
    ...mapApiKey(key),
    keyHash: key.keyHash,
  };
};

/**
 * Get API key with team access check
 */
export const getApiKeyWithAccess = async (
  db: Database,
  keyId: string,
  teamId: string
): Promise<ApiKeyResult | null> => {
  const key = await db.apiKey.findFirst({
    where: { id: keyId, teamId },
  });

  if (!key) {
    return null;
  }

  return mapApiKey(key);
};

/**
 * List team's API keys
 */
export const getTeamApiKeys = async (
  db: Database,
  teamId: string,
  options: {
    type?: ApiKeyType;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ keys: ApiKeyResult[]; total: number }> => {
  const { limit = 50, offset = 0, type, activeOnly } = options;

  const where: Prisma.ApiKeyWhereInput = { teamId };

  if (type) {
    where.type = type;
  }

  if (activeOnly) {
    where.isActive = true;
  }

  const [keys, total] = await Promise.all([
    db.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.apiKey.count({ where }),
  ]);

  return {
    keys: keys.map(mapApiKey),
    total,
  };
};

/**
 * Get API keys created by a user
 */
export const getUserApiKeys = async (
  db: Database,
  teamId: string,
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ keys: ApiKeyResult[]; total: number }> => {
  const { limit = 50, offset = 0 } = options;

  const where: Prisma.ApiKeyWhereInput = { teamId, createdBy: userId };

  const [keys, total] = await Promise.all([
    db.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.apiKey.count({ where }),
  ]);

  return {
    keys: keys.map(mapApiKey),
    total,
  };
};

/**
 * Check if API key exists and is active
 */
export const isApiKeyValid = async (
  db: Database,
  keyId: string
): Promise<boolean> => {
  const key = await db.apiKey.findUnique({
    where: { id: keyId },
    select: { isActive: true, expiresAt: true },
  });

  if (!key?.isActive) {
    return false;
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    return false;
  }

  return true;
};

/**
 * Count active API keys for a team
 */
export const countActiveApiKeys = async (
  db: Database,
  teamId: string
): Promise<number> =>
  await db.apiKey.count({
    where: {
      teamId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

/**
 * Get expired API keys
 */
export const getExpiredApiKeys = async (
  db: Database,
  options: { limit?: number } = {}
): Promise<ApiKeyResult[]> => {
  const { limit = 100 } = options;

  const keys = await db.apiKey.findMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
    },
    take: limit,
  });

  return keys.map(mapApiKey);
};

// === Helper Functions ===

function mapApiKey(key: {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  type: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  allowedIps: string[];
  allowedDomains: string[];
  rateLimit: unknown;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): ApiKeyResult {
  const rateLimit =
    (key.rateLimit as {
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
    }) || {};

  return {
    id: key.id,
    teamId: key.teamId,
    name: key.name,
    description: key.description,
    keyPrefix: key.keyPrefix,
    type: key.type as ApiKeyType,
    scopes: key.scopes,
    isActive: key.isActive,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    allowedIps: key.allowedIps,
    allowedDomains: key.allowedDomains,
    rateLimit,
    createdBy: key.createdBy,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}
