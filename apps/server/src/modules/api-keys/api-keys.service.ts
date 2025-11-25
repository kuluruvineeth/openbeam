/**
 * API Keys Management Service
 * Business logic for API key operations
 *
 * Uses @openplane/db queries/mutations for centralized database access.
 */

import { createHash, randomBytes } from "node:crypto";
import prisma, {
  type ApiKeyType,
  createApiKey as dbCreateApiKey,
  deleteApiKey as dbDeleteApiKey,
  revokeApiKey as dbRevokeApiKey,
  rotateApiKey as dbRotateApiKey,
  updateApiKey as dbUpdateApiKey,
  getApiKeyWithAccess,
  getTeamApiKeys,
  updateApiKeyLastUsed,
} from "@openplane/db";

// ============================================================================
// Types
// ============================================================================

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  type: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface ApiKeyDetail extends ApiKeySummary {
  description?: string;
  allowedIps: string[];
  allowedDomains: string[];
  rateLimit: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  createdBy: string;
}

export interface CreateApiKeyResult {
  id: string;
  key: string;
  prefix: string;
  name: string;
  type: string;
  scopes: string[];
  expiresAt?: string;
  createdAt: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class ApiKeysService {
  private readonly KEY_PREFIX = "op_";

  /**
   * List API keys for a team
   * Uses @db getTeamApiKeys query
   */
  async listApiKeys(
    teamId: string,
    options: {
      type?: string;
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ keys: ApiKeySummary[]; total: number }> {
    const { type, activeOnly, limit = 50, offset = 0 } = options;
    const result = await getTeamApiKeys(prisma, teamId, {
      type: type ? this.mapKeyType(type) : undefined,
      activeOnly,
      limit,
      offset,
    });

    return {
      keys: result.keys.map((k) => this.mapKeyResultToSummary(k)),
      total: result.total,
    };
  }

  /**
   * Get API key by ID
   * Uses @db getApiKeyWithAccess query
   */
  async getApiKey(keyId: string, teamId: string): Promise<ApiKeyDetail | null> {
    const key = await getApiKeyWithAccess(prisma, keyId, teamId);

    if (!key) {
      return null;
    }

    return this.mapKeyResultToDetail(key);
  }

  /**
   * Create a new API key
   * Uses @db createApiKey mutation
   */
  async createApiKey(
    teamId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      type?: string;
      scopes: string[];
      expiresIn?: number;
      allowedIps?: string[];
      allowedDomains?: string[];
      rateLimit?: {
        requestsPerMinute?: number;
        requestsPerHour?: number;
        requestsPerDay?: number;
      };
    }
  ): Promise<CreateApiKeyResult> {
    // Generate key
    const rawKey = this.generateKey();
    const prefix = rawKey.slice(0, 12);
    const keyHash = this.hashKey(rawKey);

    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 24 * 60 * 60 * 1000)
      : undefined;

    const keyId = await dbCreateApiKey(prisma, {
      teamId,
      name: data.name,
      description: data.description,
      keyPrefix: prefix,
      keyHash,
      type: this.mapKeyType(data.type || "standard"),
      scopes: data.scopes,
      expiresAt,
      allowedIps: data.allowedIps,
      allowedDomains: data.allowedDomains,
      rateLimit: data.rateLimit,
      createdBy: userId,
    });

    return {
      id: keyId,
      key: rawKey, // Return full key only on creation
      prefix,
      name: data.name,
      type: (data.type || "standard").toLowerCase(),
      scopes: data.scopes,
      expiresAt: expiresAt?.toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Update an API key
   * Uses @db updateApiKey mutation
   */
  async updateApiKey(
    keyId: string,
    teamId: string,
    data: Partial<{
      name: string;
      description: string;
      scopes: string[];
      allowedIps: string[];
      allowedDomains: string[];
      rateLimit: {
        requestsPerMinute?: number;
        requestsPerHour?: number;
        requestsPerDay?: number;
      };
    }>
  ): Promise<ApiKeyDetail | null> {
    const updated = await dbUpdateApiKey(prisma, keyId, teamId, {
      name: data.name,
      description: data.description,
      scopes: data.scopes,
      allowedIps: data.allowedIps,
      allowedDomains: data.allowedDomains,
      rateLimit: data.rateLimit,
    });

    if (!updated) {
      return null;
    }

    return this.getApiKey(keyId, teamId);
  }

  /**
   * Revoke an API key
   * Uses @db revokeApiKey mutation
   */
  async revokeApiKey(
    keyId: string,
    teamId: string,
    _userId: string,
    _reason?: string
  ): Promise<boolean> {
    return await dbRevokeApiKey(prisma, keyId, teamId);
  }

  /**
   * Delete an API key
   * Uses @db deleteApiKey mutation
   */
  async deleteApiKey(keyId: string, teamId: string): Promise<boolean> {
    return await dbDeleteApiKey(prisma, keyId, teamId);
  }

  /**
   * Rotate an API key (generate new secret)
   * Uses @db rotateApiKey mutation
   */
  async rotateApiKey(
    keyId: string,
    teamId: string
  ): Promise<CreateApiKeyResult | null> {
    // Get existing key first
    const existingKey = await this.getApiKey(keyId, teamId);
    if (!existingKey) {
      return null;
    }

    // Generate new key
    const rawKey = this.generateKey();
    const newPrefix = rawKey.slice(0, 12);
    const newKeyHash = this.hashKey(rawKey);

    const newKeyId = await dbRotateApiKey(
      prisma,
      keyId,
      teamId,
      newPrefix,
      newKeyHash
    );

    if (!newKeyId) {
      return null;
    }

    return {
      id: newKeyId,
      key: rawKey,
      prefix: newPrefix,
      name: existingKey.name,
      type: existingKey.type,
      scopes: existingKey.scopes,
      expiresAt: existingKey.expiresAt,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsage(
    keyId: string,
    teamId: string,
    period: "1h" | "24h" | "7d" | "30d"
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTimeMs: number;
    requestsByEndpoint: Array<{ endpoint: string; count: number }>;
    requestsOverTime: Array<{ timestamp: string; count: number }>;
  } | null> {
    // Verify key exists
    const key = await getApiKeyWithAccess(prisma, keyId, teamId);

    if (!key) {
      return null;
    }

    const periodMs = this.periodToMs(period);
    const fromDate = new Date(Date.now() - periodMs);

    // Get usage logs (still using prisma directly for now until we add this to @db)
    const logs = await prisma.apiKeyUsageLog.findMany({
      where: {
        apiKeyId: keyId,
        createdAt: { gte: fromDate },
      },
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter((l) => l.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const avgResponseTimeMs =
      totalRequests > 0
        ? logs.reduce((sum, l) => sum + l.responseTimeMs, 0) / totalRequests
        : 0;

    // Group by endpoint
    const endpointCount = new Map<string, number>();
    for (const log of logs) {
      const count = endpointCount.get(log.endpoint) || 0;
      endpointCount.set(log.endpoint, count + 1);
    }

    const requestsByEndpoint = Array.from(endpointCount.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTimeMs,
      requestsByEndpoint,
      requestsOverTime: [], // Would need time-series aggregation
    };
  }

  /**
   * Record API key usage
   * Uses @db updateApiKeyLastUsed mutation
   */
  async recordUsage(keyId: string): Promise<void> {
    await updateApiKeyLastUsed(prisma, keyId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateKey(): string {
    const random = randomBytes(24).toString("base64url");
    return `${this.KEY_PREFIX}${random}`;
  }

  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }

  private mapKeyType(type: string): ApiKeyType {
    const typeMap: Record<string, ApiKeyType> = {
      standard: "STANDARD",
      restricted: "RESTRICTED",
      admin: "ADMIN",
      service: "SERVICE",
      webhook: "WEBHOOK",
      embed: "EMBED",
    };
    return typeMap[type.toLowerCase()] || "STANDARD";
  }

  private periodToMs(period: string): number {
    const periods: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    return periods[period] || periods["24h"];
  }

  private mapKeyResultToSummary(key: {
    id: string;
    name: string;
    keyPrefix: string;
    type: ApiKeyType;
    scopes: string[];
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  }): ApiKeySummary {
    return {
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      type: key.type.toLowerCase(),
      scopes: key.scopes,
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString(),
      usageCount: 0, // Would need to track this separately
    };
  }

  private mapKeyResultToDetail(key: {
    id: string;
    name: string;
    keyPrefix: string;
    type: ApiKeyType;
    scopes: string[];
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    description: string | null;
    allowedIps: string[];
    allowedDomains: string[];
    rateLimit: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
    };
    createdBy: string;
  }): ApiKeyDetail {
    return {
      ...this.mapKeyResultToSummary(key),
      description: key.description || undefined,
      allowedIps: key.allowedIps,
      allowedDomains: key.allowedDomains,
      rateLimit: {
        requestsPerMinute: key.rateLimit.requestsPerMinute,
        requestsPerHour: key.rateLimit.requestsPerHour,
        requestsPerDay: key.rateLimit.requestsPerDay,
      },
      createdBy: key.createdBy,
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const apiKeysService = new ApiKeysService();
