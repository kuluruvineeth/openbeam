/**
 * Enterprise Mutations
 * Mutation functions for SSO, compliance, branding, and feature flags
 */

import type {
  ComplianceSettings,
  CustomBranding,
  FeatureFlag,
  Prisma,
  SSOConfig,
  SSOProtocol,
  SSOStatus,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// SSO Types
// ============================================================================

export interface UpsertSSOConfigInput {
  teamId: string;
  name: string;
  protocol: SSOProtocol;
  issuer?: string;
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  certificateIv?: string;
  clientId?: string;
  clientSecretEncrypted?: string;
  clientSecretIv?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  jwksUrl?: string;
  scopes?: string[];
  attributeMapping?: Prisma.InputJsonValue;
  autoProvision?: boolean;
  autoDeprovision?: boolean;
  defaultRole?: string;
  allowedDomains?: string[];
  status?: SSOStatus;
  testMode?: boolean;
}

// ============================================================================
// SSO Mutations
// ============================================================================

/**
 * Upsert SSO configuration
 */
export const upsertSSOConfig = async (
  db: Database,
  data: UpsertSSOConfigInput
): Promise<SSOConfig> => {
  const { teamId, ...rest } = data;

  return db.sSOConfig.upsert({
    where: { teamId },
    create: { teamId, ...rest },
    update: rest,
  });
};

/**
 * Update SSO status
 */
export const updateSSOStatus = async (
  db: Database,
  teamId: string,
  status: SSOStatus,
  lastError?: string
): Promise<SSOConfig> =>
  db.sSOConfig.update({
    where: { teamId },
    data: {
      status,
      lastError,
      lastErrorAt: lastError ? new Date() : null,
    },
  });

/**
 * Delete SSO configuration
 */
export const deleteSSOConfig = async (
  db: Database,
  teamId: string
): Promise<SSOConfig> =>
  db.sSOConfig.delete({
    where: { teamId },
  });

// ============================================================================
// Compliance Mutations
// ============================================================================

export interface UpdateComplianceSettingsInput {
  dataRetentionEnabled?: boolean;
  dataRetentionDays?: number;
  auditLogRetentionDays?: number;
  auditAllSearches?: boolean;
  auditAllViews?: boolean;
  dlpEnabled?: boolean;
  dlpRules?: Prisma.InputJsonValue;
  contentModerationEnabled?: boolean;
  blockedKeywords?: string[];
  ipAllowlistEnabled?: boolean;
  ipAllowlist?: string[];
  allowDataExport?: boolean;
  exportApprovalRequired?: boolean;
  allowExternalAI?: boolean;
  aiDataRetention?: boolean;
}

/**
 * Upsert compliance settings
 */
export const upsertComplianceSettings = async (
  db: Database,
  teamId: string,
  data: UpdateComplianceSettingsInput
): Promise<ComplianceSettings> =>
  db.complianceSettings.upsert({
    where: { teamId },
    create: { teamId, ...data },
    update: data,
  });

// ============================================================================
// Branding Mutations
// ============================================================================

export interface UpdateBrandingInput {
  companyName?: string;
  logoUrl?: string;
  logoIconUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  theme?: Prisma.InputJsonValue;
  customCss?: string;
  loginBackground?: string;
  loginMessage?: string;
  footerText?: string;
  footerLinks?: Prisma.InputJsonValue;
  supportEmail?: string;
  supportUrl?: string;
  docsUrl?: string;
  isActive?: boolean;
}

/**
 * Upsert custom branding
 */
export const upsertCustomBranding = async (
  db: Database,
  teamId: string,
  data: UpdateBrandingInput
): Promise<CustomBranding> =>
  db.customBranding.upsert({
    where: { teamId },
    create: { teamId, ...data },
    update: data,
  });

/**
 * Delete custom branding
 */
export const deleteCustomBranding = async (
  db: Database,
  teamId: string
): Promise<CustomBranding> =>
  db.customBranding.delete({
    where: { teamId },
  });

// ============================================================================
// Feature Flag Mutations
// ============================================================================

export interface CreateFeatureFlagInput {
  teamId: string;
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  value?: Prisma.InputJsonValue;
  targetType?: string;
  targetPercentage?: number;
  targetUserIds?: string[];
  targetGroupIds?: string[];
  expiresAt?: Date;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  value?: Prisma.InputJsonValue;
  targetType?: string;
  targetPercentage?: number;
  targetUserIds?: string[];
  targetGroupIds?: string[];
  expiresAt?: Date | null;
}

/**
 * Create feature flag
 */
export const createFeatureFlag = async (
  db: Database,
  data: CreateFeatureFlagInput
): Promise<FeatureFlag> => db.featureFlag.create({ data });

/**
 * Update feature flag
 */
export const updateFeatureFlag = async (
  db: Database,
  teamId: string,
  key: string,
  data: UpdateFeatureFlagInput
): Promise<FeatureFlag> =>
  db.featureFlag.update({
    where: { teamId_key: { teamId, key } },
    data,
  });

/**
 * Delete feature flag
 */
export const deleteFeatureFlag = async (
  db: Database,
  teamId: string,
  key: string
): Promise<FeatureFlag> =>
  db.featureFlag.delete({
    where: { teamId_key: { teamId, key } },
  });

/**
 * Toggle feature flag
 */
export const toggleFeatureFlag = async (
  db: Database,
  teamId: string,
  key: string
): Promise<FeatureFlag> => {
  const flag = await db.featureFlag.findUnique({
    where: { teamId_key: { teamId, key } },
  });

  if (!flag) {
    throw new Error("Feature flag not found");
  }

  return db.featureFlag.update({
    where: { teamId_key: { teamId, key } },
    data: { enabled: !flag.enabled },
  });
};

// ============================================================================
// Security Alert Mutations
// ============================================================================

/**
 * Update security alert status
 */
export const updateSecurityAlertStatus = async (
  db: Database,
  alertId: string,
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE",
  resolution?: string,
  resolvedBy?: string
): Promise<any> =>
  db.securityAlert.update({
    where: { id: alertId },
    data: {
      status,
      resolution,
      resolvedBy,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });
