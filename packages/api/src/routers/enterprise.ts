/**
 * Enterprise Router
 * SSO, compliance, branding, and feature flag management
 *
 * Most routes require Admin/Owner access
 */

import {
  createFeatureFlag,
  deleteCustomBranding,
  deleteFeatureFlag,
  deleteSSOConfig,
  getComplianceSettings,
  getCustomBranding,
  getFeatureFlag,
  getSSOConfig,
  isFeatureEnabled,
  listFeatureFlags,
  listSecurityAlerts,
  toggleFeatureFlag,
  updateFeatureFlag,
  updateSecurityAlertStatus,
  updateSSOStatus,
  upsertComplianceSettings,
  upsertCustomBranding,
  upsertSSOConfig,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "..";
import { withActiveTeam, withAdmin, withOwner } from "../middleware";

// ============================================================================
// Schemas
// ============================================================================

// SSO schemas
const ssoProtocolEnum = z.enum(["SAML", "OIDC", "OAUTH2"]);
const ssoStatusEnum = z.enum(["ACTIVE", "INACTIVE", "TESTING", "ERROR"]);

const updateSSOSchema = z.object({
  name: z.string().min(1).max(100),
  protocol: ssoProtocolEnum,
  issuer: z.string().optional(),
  entityId: z.string().optional(),
  ssoUrl: z.string().url().optional(),
  sloUrl: z.string().url().optional(),
  clientId: z.string().optional(),
  authorizationUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  userInfoUrl: z.string().url().optional(),
  jwksUrl: z.string().url().optional(),
  scopes: z.array(z.string()).default(["openid", "profile", "email"]),
  attributeMapping: z.record(z.string()).default({}),
  autoProvision: z.boolean().default(true),
  autoDeprovision: z.boolean().default(false),
  defaultRole: z.string().default("MEMBER"),
  allowedDomains: z.array(z.string()).default([]),
  testMode: z.boolean().default(false),
});

// Compliance schemas
const updateComplianceSchema = z.object({
  dataRetentionEnabled: z.boolean().optional(),
  dataRetentionDays: z.number().min(1).optional(),
  auditLogRetentionDays: z.number().min(1).default(365),
  auditAllSearches: z.boolean().optional(),
  auditAllViews: z.boolean().optional(),
  dlpEnabled: z.boolean().optional(),
  dlpRules: z.array(z.record(z.unknown())).optional(),
  contentModerationEnabled: z.boolean().optional(),
  blockedKeywords: z.array(z.string()).optional(),
  ipAllowlistEnabled: z.boolean().optional(),
  ipAllowlist: z.array(z.string()).optional(),
  allowDataExport: z.boolean().optional(),
  exportApprovalRequired: z.boolean().optional(),
  allowExternalAI: z.boolean().optional(),
  aiDataRetention: z.boolean().optional(),
});

// Branding schemas
const updateBrandingSchema = z.object({
  companyName: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  logoIconUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  theme: z.record(z.string()).optional(),
  customCss: z.string().max(10_000).optional(),
  loginBackground: z.string().url().optional(),
  loginMessage: z.string().max(500).optional(),
  footerText: z.string().max(500).optional(),
  footerLinks: z
    .array(z.object({ text: z.string(), url: z.string().url() }))
    .optional(),
  supportEmail: z.string().email().optional(),
  supportUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// Feature flag schemas
const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  value: z.unknown().optional(),
  targetType: z.enum(["all", "percentage", "users", "groups"]).default("all"),
  targetPercentage: z.number().min(0).max(100).optional(),
  targetUserIds: z.array(z.string()).default([]),
  targetGroupIds: z.array(z.string()).default([]),
  expiresAt: z.date().optional(),
});

const updateFeatureFlagSchema = z.object({
  key: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  value: z.unknown().optional(),
  targetType: z.enum(["all", "percentage", "users", "groups"]).optional(),
  targetPercentage: z.number().min(0).max(100).optional(),
  targetUserIds: z.array(z.string()).optional(),
  targetGroupIds: z.array(z.string()).optional(),
  expiresAt: z.date().optional().nullable(),
});

// Security alerts schema
const listSecurityAlertsSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z
    .enum(["OPEN", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"])
    .optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// Router
// ============================================================================

export const enterpriseRouter = createTRPCRouter({
  // ==========================================================================
  // SSO Configuration (Owner only)
  // ==========================================================================

  /**
   * Get SSO configuration
   */
  getSSOConfig: withAdmin.query(async ({ ctx }) =>
    getSSOConfig(ctx.prisma, ctx.teamId)
  ),

  /**
   * Update SSO configuration
   */
  updateSSOConfig: withOwner
    .input(updateSSOSchema)
    .mutation(async ({ ctx, input }) =>
      upsertSSOConfig(ctx.prisma, {
        teamId: ctx.teamId,
        ...input,
      })
    ),

  /**
   * Update SSO status
   */
  updateSSOStatus: withOwner
    .input(
      z.object({
        status: ssoStatusEnum,
        lastError: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      updateSSOStatus(ctx.prisma, ctx.teamId, input.status, input.lastError)
    ),

  /**
   * Delete SSO configuration
   */
  deleteSSOConfig: withOwner.mutation(async ({ ctx }) => {
    try {
      await deleteSSOConfig(ctx.prisma, ctx.teamId);
      return { success: true };
    } catch {
      return { success: false };
    }
  }),

  // ==========================================================================
  // Compliance Settings (Admin)
  // ==========================================================================

  /**
   * Get compliance settings
   */
  getComplianceSettings: withAdmin.query(async ({ ctx }) =>
    getComplianceSettings(ctx.prisma, ctx.teamId)
  ),

  /**
   * Update compliance settings
   */
  updateComplianceSettings: withAdmin
    .input(updateComplianceSchema)
    .mutation(async ({ ctx, input }) =>
      upsertComplianceSettings(ctx.prisma, ctx.teamId, input)
    ),

  // ==========================================================================
  // Custom Branding (Admin)
  // ==========================================================================

  /**
   * Get custom branding
   */
  getBranding: withActiveTeam.query(async ({ ctx }) =>
    getCustomBranding(ctx.prisma, ctx.teamId)
  ),

  /**
   * Update custom branding
   */
  updateBranding: withAdmin
    .input(updateBrandingSchema)
    .mutation(async ({ ctx, input }) =>
      upsertCustomBranding(ctx.prisma, ctx.teamId, input)
    ),

  /**
   * Reset branding to defaults
   */
  resetBranding: withAdmin.mutation(async ({ ctx }) => {
    try {
      await deleteCustomBranding(ctx.prisma, ctx.teamId);
      return { success: true };
    } catch {
      return { success: false };
    }
  }),

  // ==========================================================================
  // Feature Flags (Admin)
  // ==========================================================================

  /**
   * List feature flags
   */
  listFeatureFlags: withAdmin.query(async ({ ctx }) =>
    listFeatureFlags(ctx.prisma, ctx.teamId)
  ),

  /**
   * Get feature flag
   */
  getFeatureFlag: withAdmin
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const flag = await getFeatureFlag(ctx.prisma, ctx.teamId, input.key);

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      return flag;
    }),

  /**
   * Check if feature is enabled (for any user)
   */
  isFeatureEnabled: withActiveTeam
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) =>
      isFeatureEnabled(ctx.prisma, ctx.teamId, input.key, ctx.session.user.id)
    ),

  /**
   * Create feature flag
   */
  createFeatureFlag: withAdmin
    .input(createFeatureFlagSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for existing flag
      const existing = await getFeatureFlag(ctx.prisma, ctx.teamId, input.key);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Feature flag with this key already exists",
        });
      }

      return createFeatureFlag(ctx.prisma, {
        teamId: ctx.teamId,
        ...input,
      });
    }),

  /**
   * Update feature flag
   */
  updateFeatureFlag: withAdmin
    .input(updateFeatureFlagSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await getFeatureFlag(ctx.prisma, ctx.teamId, input.key);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      const { key, ...data } = input;

      return updateFeatureFlag(ctx.prisma, ctx.teamId, key, data);
    }),

  /**
   * Toggle feature flag
   */
  toggleFeatureFlag: withAdmin
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleFeatureFlag(ctx.prisma, ctx.teamId, input.key);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }
    }),

  /**
   * Delete feature flag
   */
  deleteFeatureFlag: withAdmin
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteFeatureFlag(ctx.prisma, ctx.teamId, input.key);
        return { success: true };
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }
    }),

  // ==========================================================================
  // Security Alerts (Admin)
  // ==========================================================================

  /**
   * List security alerts
   */
  listSecurityAlerts: withAdmin
    .input(listSecurityAlertsSchema)
    .query(async ({ ctx, input }) => {
      const result = await listSecurityAlerts(ctx.prisma, ctx.teamId, {
        severity: input.severity,
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        alerts: result.alerts,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.alerts.length < result.total,
        },
      };
    }),

  /**
   * Update security alert status
   */
  updateSecurityAlertStatus: withAdmin
    .input(
      z.object({
        alertId: z.string(),
        status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"]),
        resolution: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      updateSecurityAlertStatus(
        ctx.prisma,
        input.alertId,
        input.status,
        input.resolution,
        ctx.session.user.id
      )
    ),
});
