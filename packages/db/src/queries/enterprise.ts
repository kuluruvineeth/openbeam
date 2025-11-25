/**
 * Enterprise Queries
 * Query functions for SSO, compliance, branding, and feature flags
 */

import type {
  ComplianceSettings,
  CustomBranding,
  FeatureFlag,
  SSOConfig,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// SSO Queries
// ============================================================================

/**
 * Get SSO config for a team
 */
export const getSSOConfig = async (
  db: Database,
  teamId: string
): Promise<SSOConfig | null> =>
  db.sSOConfig.findUnique({
    where: { teamId },
  });

// ============================================================================
// Compliance Queries
// ============================================================================

/**
 * Get compliance settings for a team
 */
export const getComplianceSettings = async (
  db: Database,
  teamId: string
): Promise<ComplianceSettings | null> =>
  db.complianceSettings.findUnique({
    where: { teamId },
  });

// ============================================================================
// Branding Queries
// ============================================================================

/**
 * Get custom branding for a team
 */
export const getCustomBranding = async (
  db: Database,
  teamId: string
): Promise<CustomBranding | null> =>
  db.customBranding.findUnique({
    where: { teamId },
  });

// ============================================================================
// Feature Flag Queries
// ============================================================================

/**
 * List feature flags for a team
 */
export const listFeatureFlags = async (
  db: Database,
  teamId: string
): Promise<FeatureFlag[]> =>
  db.featureFlag.findMany({
    where: { teamId },
    orderBy: { key: "asc" },
  });

/**
 * Get feature flag by key
 */
export const getFeatureFlag = async (
  db: Database,
  teamId: string,
  key: string
): Promise<FeatureFlag | null> =>
  db.featureFlag.findUnique({
    where: { teamId_key: { teamId, key } },
  });

/**
 * Check if feature is enabled for a team
 */
export const isFeatureEnabled = async (
  db: Database,
  teamId: string,
  key: string,
  userId?: string
): Promise<boolean> => {
  const flag = await db.featureFlag.findUnique({
    where: { teamId_key: { teamId, key } },
  });

  if (!(flag && flag.enabled)) {
    return flag?.globalDefault ?? false;
  }

  // Check expiration
  if (flag.expiresAt && flag.expiresAt < new Date()) {
    return flag.globalDefault;
  }

  // Check targeting
  if (flag.targetType === "all") {
    return true;
  }

  if (flag.targetType === "users" && userId) {
    return flag.targetUserIds.includes(userId);
  }

  if (flag.targetType === "percentage" && flag.targetPercentage) {
    // Simple percentage rollout based on userId hash
    if (userId) {
      const hash = userId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
      return hash % 100 < flag.targetPercentage;
    }
    return false;
  }

  return true;
};

// ============================================================================
// Security Alert Queries
// ============================================================================

export interface ListSecurityAlertsOptions {
  severity?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * List security alerts for a team
 */
export const listSecurityAlerts = async (
  db: Database,
  teamId: string,
  options: ListSecurityAlertsOptions = {}
): Promise<{ alerts: any[]; total: number }> => {
  const { severity, status, limit = 50, offset = 0 } = options;

  const where = {
    teamId,
    ...(severity && { severity: severity as any }),
    ...(status && { status: status as any }),
  };

  const [alerts, total] = await Promise.all([
    db.securityAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.securityAlert.count({ where }),
  ]);

  return { alerts, total };
};
