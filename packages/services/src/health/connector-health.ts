import type { AppType, Database } from "@openbeam/db";
import {
  ConnectorStatus,
  findConnectorById,
  getConnectorIdsByTeamExcludingStatuses,
  getDecryptedOAuthCredentials,
} from "@openbeam/db";
import { z } from "zod";
import { normalizeApiError } from "../errors";

export const HealthStatus = z.enum([
  "healthy",
  "degraded",
  "unhealthy",
  "unknown",
]);
export type HealthStatus = z.infer<typeof HealthStatus>;

export const CheckStatus = z.enum(["pass", "fail", "warn", "skip"]);
export type CheckStatus = z.infer<typeof CheckStatus>;

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  message?: string;
  latencyMs?: number;
}

export interface ConnectorHealthResult {
  connectorId: string;
  connectorType: AppType;
  connectorName: string;
  status: HealthStatus;
  checks: HealthCheck[];
  checkedAt: Date;
}

export interface HealthCheckContext {
  db: Database;
  connectorId: string;
  teamId: string;
}

const HEALTH_CHECK_TIMEOUT_MS = 10_000;

export async function checkConnectorHealth(
  ctx: HealthCheckContext
): Promise<ConnectorHealthResult | null> {
  const connector = await findConnectorById(ctx.db, ctx.connectorId, true);

  if (!connector || connector.teamId !== ctx.teamId) {
    return null;
  }

  const checks: HealthCheck[] = [];
  const isPublicDataset = connector.authType === "PUBLIC_DATASET";

  if (isPublicDataset) {
    checks.push({
      name: "credentials",
      status: "skip",
      message: "Public dataset — no credentials required",
    });
  } else {
    const credentialCheck = await checkCredentialsPresent(ctx);
    checks.push(credentialCheck);

    if (credentialCheck.status === "pass") {
      const tokenCheck = await checkTokenValidity(ctx);
      checks.push(tokenCheck);

      if (tokenCheck.status === "pass") {
        const apiCheck = await checkApiConnectivity(ctx, connector.app);
        checks.push(apiCheck);
      }
    }
  }

  const configCheck = checkConnectorConfig(connector);
  checks.push(configCheck);

  const status = deriveOverallStatus(checks);

  return {
    connectorId: connector.id,
    connectorType: connector.app,
    connectorName: connector.name,
    status,
    checks,
    checkedAt: new Date(),
  };
}

async function checkCredentialsPresent(
  ctx: HealthCheckContext
): Promise<HealthCheck> {
  const startMs = performance.now();

  const credentials = await getDecryptedOAuthCredentials(
    ctx.db,
    ctx.connectorId
  );

  const latencyMs = Math.round(performance.now() - startMs);

  if (!credentials) {
    return {
      name: "credentials",
      status: "fail",
      message: "No OAuth credentials found",
      latencyMs,
    };
  }

  if (!credentials.accessToken) {
    return {
      name: "credentials",
      status: "fail",
      message: "Access token missing",
      latencyMs,
    };
  }

  return {
    name: "credentials",
    status: "pass",
    latencyMs,
  };
}

async function checkTokenValidity(
  ctx: HealthCheckContext
): Promise<HealthCheck> {
  const startMs = performance.now();

  const credentials = await getDecryptedOAuthCredentials(
    ctx.db,
    ctx.connectorId
  );

  const latencyMs = Math.round(performance.now() - startMs);

  if (!credentials) {
    return {
      name: "token_validity",
      status: "skip",
      message: "No credentials to validate",
      latencyMs,
    };
  }

  if (credentials.isExpired) {
    const hasRefreshToken = !!credentials.refreshToken;
    return {
      name: "token_validity",
      status: hasRefreshToken ? "warn" : "fail",
      message: hasRefreshToken
        ? "Token expired but refresh token available"
        : "Token expired and no refresh token",
      latencyMs,
    };
  }

  const expiresInSeconds = credentials.expiresInSeconds;
  if (expiresInSeconds !== null && expiresInSeconds < 300) {
    return {
      name: "token_validity",
      status: "warn",
      message: `Token expires in ${expiresInSeconds} seconds`,
      latencyMs,
    };
  }

  return {
    name: "token_validity",
    status: "pass",
    latencyMs,
  };
}

async function checkApiConnectivity(
  ctx: HealthCheckContext,
  connectorType: AppType
): Promise<HealthCheck> {
  const startMs = performance.now();

  const credentials = await getDecryptedOAuthCredentials(
    ctx.db,
    ctx.connectorId
  );

  if (!credentials?.accessToken) {
    return {
      name: "api_connectivity",
      status: "skip",
      message: "No access token for API check",
      latencyMs: Math.round(performance.now() - startMs),
    };
  }

  const endpoint = getHealthEndpoint(connectorType);

  if (!endpoint) {
    return {
      name: "api_connectivity",
      status: "skip",
      message: `No health endpoint configured for ${connectorType}`,
      latencyMs: Math.round(performance.now() - startMs),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - startMs);

    if (response.ok) {
      return {
        name: "api_connectivity",
        status: "pass",
        latencyMs,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        name: "api_connectivity",
        status: "fail",
        message: `Authentication failed: ${response.status}`,
        latencyMs,
      };
    }

    if (response.status === 429) {
      return {
        name: "api_connectivity",
        status: "warn",
        message: "Rate limited",
        latencyMs,
      };
    }

    return {
      name: "api_connectivity",
      status: "warn",
      message: `API returned ${response.status}`,
      latencyMs,
    };
  } catch (error) {
    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - startMs);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        name: "api_connectivity",
        status: "fail",
        message: "Request timed out",
        latencyMs,
      };
    }

    const connectorError = normalizeApiError(error, ctx.connectorId);
    return {
      name: "api_connectivity",
      status: connectorError.retryable ? "warn" : "fail",
      message: connectorError.message,
      latencyMs,
    };
  }
}

interface HealthEndpoint {
  url: string;
  method: "GET" | "POST";
}

function getHealthEndpoint(connectorType: AppType): HealthEndpoint | null {
  const endpoints: Partial<Record<AppType, HealthEndpoint>> = {
    LINEAR: {
      url: "https://api.linear.app/graphql",
      method: "POST",
    },
    SLACK: {
      url: "https://slack.com/api/auth.test",
      method: "POST",
    },
    NOTION: {
      url: "https://api.notion.com/v1/users/me",
      method: "GET",
    },
    GOOGLE_DRIVE: {
      url: "https://www.googleapis.com/drive/v3/about?fields=user",
      method: "GET",
    },
    GMAIL: {
      url: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      method: "GET",
    },
  };

  return endpoints[connectorType] ?? null;
}

function checkConnectorConfig(connector: {
  config: unknown;
  status: string;
}): HealthCheck {
  const config = connector.config as Record<string, unknown> | null;

  if (!config) {
    return {
      name: "configuration",
      status: "warn",
      message: "No configuration present",
    };
  }

  if (connector.status === "ERROR") {
    return {
      name: "configuration",
      status: "fail",
      message: "Connector is in error state",
    };
  }

  if (connector.status === "INACTIVE" || connector.status === "PAUSED") {
    return {
      name: "configuration",
      status: "warn",
      message: `Connector is ${connector.status.toLowerCase()}`,
    };
  }

  return {
    name: "configuration",
    status: "pass",
  };
}

function deriveOverallStatus(checks: HealthCheck[]): HealthStatus {
  const hasFailure = checks.some((c) => c.status === "fail");
  const hasWarning = checks.some((c) => c.status === "warn");
  const allSkipped = checks.every((c) => c.status === "skip");

  if (allSkipped) {
    return "unknown";
  }

  if (hasFailure) {
    return "unhealthy";
  }

  if (hasWarning) {
    return "degraded";
  }

  return "healthy";
}

export interface BatchHealthCheckResult {
  results: ConnectorHealthResult[];
  checkedAt: Date;
  successCount: number;
  failureCount: number;
  degradedCount: number;
}

export async function checkTeamConnectorsHealth(
  db: Database,
  teamId: string
): Promise<BatchHealthCheckResult> {
  const connectors = await getConnectorIdsByTeamExcludingStatuses(db, teamId, [
    ConnectorStatus.INACTIVE,
    ConnectorStatus.DELETING,
  ]);

  const results: ConnectorHealthResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let degradedCount = 0;

  for (const connector of connectors) {
    const result = await checkConnectorHealth({
      db,
      connectorId: connector.id,
      teamId,
    });

    if (result) {
      results.push(result);

      if (result.status === "healthy") {
        successCount += 1;
      } else if (result.status === "unhealthy") {
        failureCount += 1;
      } else if (result.status === "degraded") {
        degradedCount += 1;
      }
    }
  }

  return {
    results,
    checkedAt: new Date(),
    successCount,
    failureCount,
    degradedCount,
  };
}

export function isHealthy(result: ConnectorHealthResult): boolean {
  return result.status === "healthy";
}

export function needsAttention(result: ConnectorHealthResult): boolean {
  return result.status === "unhealthy" || result.status === "degraded";
}

export function getFailedChecks(result: ConnectorHealthResult): HealthCheck[] {
  return result.checks.filter((c) => c.status === "fail");
}

export function getWarningChecks(result: ConnectorHealthResult): HealthCheck[] {
  return result.checks.filter((c) => c.status === "warn");
}
