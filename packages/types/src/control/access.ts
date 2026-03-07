import { z } from "zod";

export const CONTROL_MEMBERSHIP_ROLES = ["OWNER", "MEMBER", "GUEST"] as const;
export const ControlMembershipRoleSchema = z.enum(CONTROL_MEMBERSHIP_ROLES);
export type ControlMembershipRole = z.infer<typeof ControlMembershipRoleSchema>;

export const CONTROL_MEMBERSHIP_STATUSES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
] as const;

export const ControlMembershipStatusSchema = z.enum(
  CONTROL_MEMBERSHIP_STATUSES
);
export type ControlMembershipStatus = z.infer<
  typeof ControlMembershipStatusSchema
>;

export const PRINCIPAL_TYPES = ["USER", "AGENT"] as const;
export const PrincipalTypeSchema = z.enum(PRINCIPAL_TYPES);
export type PrincipalType = z.infer<typeof PrincipalTypeSchema>;

export const PERMISSION_KEYS = [
  "agents:create",
  "users:invite",
  "users:manage_permissions",
  "tasks:assign",
  "tasks:assign_scope",
  "joins:approve",
] as const;

export const PermissionKeySchema = z.enum(PERMISSION_KEYS);
export type PermissionKey = z.infer<typeof PermissionKeySchema>;

export const INVITE_TYPES = ["USER", "AGENT"] as const;
export const InviteTypeSchema = z.enum(INVITE_TYPES);
export type InviteType = z.infer<typeof InviteTypeSchema>;

export const INVITE_JOIN_TYPES = ["human", "agent", "both"] as const;
export const InviteJoinTypeSchema = z.enum(INVITE_JOIN_TYPES);
export type InviteJoinType = z.infer<typeof InviteJoinTypeSchema>;

export const JOIN_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export const JoinRequestStatusSchema = z.enum(JOIN_REQUEST_STATUSES);
export type JoinRequestStatus = z.infer<typeof JoinRequestStatusSchema>;

export const ControlCompanyMembershipSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  principalType: PrincipalTypeSchema,
  principalId: z.string(),
  status: ControlMembershipStatusSchema,
  membershipRole: ControlMembershipRoleSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlCompanyMembership = z.infer<
  typeof ControlCompanyMembershipSchema
>;

export const ControlAccessGrantSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  principalType: PrincipalTypeSchema,
  principalId: z.string(),
  permissionKey: z.string(),
  scope: z.record(z.string(), z.unknown()).nullable(),
  grantedByUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlAccessGrant = z.infer<typeof ControlAccessGrantSchema>;

export const ControlInviteSchema = z.object({
  id: z.string(),
  teamId: z.string().nullable(),
  inviteType: InviteTypeSchema,
  tokenHash: z.string(),
  allowedJoinTypes: z.string(),
  defaultsPayload: z.record(z.string(), z.unknown()).nullable(),
  expiresAt: z.date(),
  invitedByUserId: z.string().nullable(),
  revokedAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlInvite = z.infer<typeof ControlInviteSchema>;

export const ControlJoinRequestSchema = z.object({
  id: z.string(),
  inviteId: z.string(),
  teamId: z.string(),
  requestType: z.string(),
  status: JoinRequestStatusSchema,
  requestIp: z.string(),
  requestingUserId: z.string().nullable(),
  requestEmailSnapshot: z.string().nullable(),
  agentName: z.string().nullable(),
  adapterType: z.string().nullable(),
  capabilities: z.string().nullable(),
  agentDefaultsPayload: z.record(z.string(), z.unknown()).nullable(),
  claimSecretHash: z.string().nullable(),
  claimSecretExpiresAt: z.date().nullable(),
  claimSecretConsumedAt: z.date().nullable(),
  createdAgentId: z.string().nullable(),
  approvedByUserId: z.string().nullable(),
  approvedAt: z.date().nullable(),
  rejectedByUserId: z.string().nullable(),
  rejectedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlJoinRequest = z.infer<typeof ControlJoinRequestSchema>;
