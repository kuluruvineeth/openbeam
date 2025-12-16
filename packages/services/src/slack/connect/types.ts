import { z } from "zod";

export const SharedChannelTypeSchema = z.enum([
  "internal",
  "external_shared",
  "external_limited",
  "org_shared",
]);

export type SharedChannelType = z.infer<typeof SharedChannelTypeSchema>;

export const ConnectedTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  icon: z.string().optional(),
  isVerified: z.boolean().default(false),
  dateConnected: z.number().optional(),
});

export type ConnectedTeam = z.infer<typeof ConnectedTeamSchema>;

export const SharedChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SharedChannelTypeSchema,
  isExternal: z.boolean(),
  hostTeamId: z.string().optional(),
  connectedTeams: z.array(ConnectedTeamSchema),
  memberCount: z.number().optional(),
  isArchived: z.boolean().default(false),
  created: z.number().optional(),
  lastActivity: z.number().optional(),
});

export type SharedChannel = z.infer<typeof SharedChannelSchema>;

export const ExternalUserSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  displayName: z.string().optional(),
  email: z.string().optional(),
  isExternal: z.literal(true),
  isRestricted: z.boolean().default(false),
  isUltraRestricted: z.boolean().default(false),
});

export type ExternalUser = z.infer<typeof ExternalUserSchema>;

export interface ConnectSyncConfig {
  syncExternalChannels: boolean;
  syncExternalMessages: boolean;
  indexExternalUserNames: boolean;
  indexExternalContent: boolean;
  allowedExternalTeams: string[];
  blockedExternalTeams: string[];
}

export interface ConnectSyncResult {
  channelId: string;
  channelName: string;
  sharedWith: ConnectedTeam[];
  messagesIndexed: number;
  externalMessagesIndexed: number;
  externalUsersFound: number;
  skippedMessages: number;
  errors: string[];
}

export const DEFAULT_CONNECT_CONFIG: ConnectSyncConfig = {
  syncExternalChannels: true,
  syncExternalMessages: true,
  indexExternalUserNames: true,
  indexExternalContent: true,
  allowedExternalTeams: [],
  blockedExternalTeams: [],
};

export interface ConnectPermission {
  canIndexExternal: boolean;
  canIndexExternalContent: boolean;
  reason?: string;
}
