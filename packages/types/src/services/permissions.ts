import { z } from "zod";

export const PermissionContextSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  connectorId: z.string().optional(),
  resourceId: z.string().optional(),
});

export type PermissionContext = z.infer<typeof PermissionContextSchema>;

export const ResolvedPermissionsSchema = z.object({
  canRead: z.boolean(),
  canWrite: z.boolean(),
  canDelete: z.boolean(),
  canShare: z.boolean(),
  accessControlIds: z.array(z.string()),
  inheritedFrom: z.string().optional(),
  expiresAt: z.date().optional(),
});

export type ResolvedPermissions = z.infer<typeof ResolvedPermissionsSchema>;
