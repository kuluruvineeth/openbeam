import { z } from "zod";

export const EnterpriseWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  isActive: z.boolean().default(true),
  syncEnabled: z.boolean().default(true),
  lastSyncedAt: z.number().optional(),
  userCount: z.number().optional(),
  channelCount: z.number().optional(),
});

export type EnterpriseWorkspace = z.infer<typeof EnterpriseWorkspaceSchema>;

export const EnterpriseInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  emailDomain: z.string().optional(),
  isEnterprise: z.literal(true),
  workspaces: z.array(EnterpriseWorkspaceSchema),
  primaryWorkspaceId: z.string().optional(),
});

export type EnterpriseInfo = z.infer<typeof EnterpriseInfoSchema>;

export const EnterpriseUserSchema = z.object({
  id: z.string(),
  enterpriseId: z.string(),
  primaryTeamId: z.string().optional(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  isAdmin: z.boolean().default(false),
  isOwner: z.boolean().default(false),
  teamIds: z.array(z.string()).default([]),
  scimId: z.string().optional(),
});

export type EnterpriseUser = z.infer<typeof EnterpriseUserSchema>;

export interface EnterpriseSyncConfig {
  enterpriseId: string;
  syncAllWorkspaces: boolean;
  includedWorkspaceIds: string[];
  excludedWorkspaceIds: string[];
  syncUsers: boolean;
  syncChannels: boolean;
  syncMessages: boolean;
  syncFiles: boolean;
  crossWorkspaceChannels: boolean;
}

export interface EnterpriseSyncResult {
  enterpriseId: string;
  workspacesProcessed: number;
  workspaceResults: Map<string, WorkspaceSyncResult>;
  totalUsers: number;
  totalChannels: number;
  totalMessages: number;
  errors: EnterpriseError[];
  duration: number;
}

export interface WorkspaceSyncResult {
  workspaceId: string;
  workspaceName: string;
  success: boolean;
  usersIndexed: number;
  channelsIndexed: number;
  messagesIndexed: number;
  filesIndexed: number;
  errors: string[];
  duration: number;
}

export interface EnterpriseError {
  workspaceId?: string;
  code: string;
  message: string;
  recoverable: boolean;
}

export const ENTERPRISE_SCOPES = [
  "admin.teams:read",
  "admin.users:read",
  "admin.conversations:read",
] as const;

export type EnterpriseScope = (typeof ENTERPRISE_SCOPES)[number];

export interface EnterpriseAuth {
  enterpriseId: string;
  accessToken: string;
  scopes: string[];
  installedBy: string;
  installedAt: number;
}
