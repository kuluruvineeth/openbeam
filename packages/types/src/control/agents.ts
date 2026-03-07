import { z } from "zod";

export const AGENT_ICON_NAMES = [
  "bot",
  "cpu",
  "brain",
  "zap",
  "rocket",
  "code",
  "terminal",
  "shield",
  "eye",
  "search",
  "wrench",
  "hammer",
  "lightbulb",
  "sparkles",
  "star",
  "heart",
  "flame",
  "bug",
  "cog",
  "database",
  "globe",
  "lock",
  "mail",
  "message-square",
  "file-code",
  "git-branch",
  "package",
  "puzzle",
  "target",
  "wand",
  "atom",
  "circuit-board",
  "radar",
  "swords",
  "telescope",
  "microscope",
  "crown",
  "gem",
  "hexagon",
  "pentagon",
  "fingerprint",
] as const;

export const ControlAgentIconSchema = z.enum(AGENT_ICON_NAMES);
export type ControlAgentIcon = z.infer<typeof ControlAgentIconSchema>;

export const CONTROL_AGENT_STATUSES = [
  "ACTIVE",
  "IDLE",
  "RUNNING",
  "ERROR",
  "PAUSED",
  "PENDING_APPROVAL",
  "TERMINATED",
] as const;

export const ControlAgentStatusSchema = z.enum(CONTROL_AGENT_STATUSES);
export type ControlAgentStatus = z.infer<typeof ControlAgentStatusSchema>;

export const CONTROL_AGENT_ADAPTER_TYPES = [
  "PROCESS",
  "HTTP",
  "CLAUDE_LOCAL",
  "CODEX_LOCAL",
  "OPENCLAW",
] as const;

export const ControlAgentAdapterTypeSchema = z.enum(
  CONTROL_AGENT_ADAPTER_TYPES
);
export type ControlAgentAdapterType = z.infer<
  typeof ControlAgentAdapterTypeSchema
>;

export const CONTROL_AGENT_ROLES = [
  "ceo",
  "cto",
  "cmo",
  "cfo",
  "engineer",
  "designer",
  "pm",
  "qa",
  "devops",
  "researcher",
  "general",
] as const;

export const ControlAgentRoleSchema = z.enum(CONTROL_AGENT_ROLES);
export type ControlAgentRole = z.infer<typeof ControlAgentRoleSchema>;

export const ControlAgentPermissionsSchema = z.object({
  canCreateAgents: z.boolean().default(false),
});

export type ControlAgentPermissions = z.infer<
  typeof ControlAgentPermissionsSchema
>;

export const ControlAgentSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  role: z.string(),
  title: z.string().nullable(),
  icon: z.string().nullable(),
  status: ControlAgentStatusSchema,
  reportsTo: z.string().nullable(),
  capabilities: z.string().nullable(),
  adapterType: ControlAgentAdapterTypeSchema,
  adapterConfig: z.record(z.string(), z.unknown()),
  runtimeConfig: z.record(z.string(), z.unknown()),
  budgetMonthlyCents: z.number().int(),
  spentMonthlyCents: z.number().int(),
  permissions: ControlAgentPermissionsSchema,
  lastHeartbeatAt: z.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlAgent = z.infer<typeof ControlAgentSchema>;

export const ControlAgentApiKeySchema = z.object({
  id: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  name: z.string(),
  keyHash: z.string(),
  lastUsedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type ControlAgentApiKey = z.infer<typeof ControlAgentApiKeySchema>;

export const ControlAgentApiKeyCreatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string(),
  createdAt: z.date(),
});

export type ControlAgentApiKeyCreated = z.infer<
  typeof ControlAgentApiKeyCreatedSchema
>;

export const ControlAgentConfigRevisionSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  createdByAgentId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  source: z.string(),
  rolledBackFromRevisionId: z.string().nullable(),
  changedKeys: z.array(z.string()),
  beforeConfig: z.record(z.string(), z.unknown()),
  afterConfig: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
});

export type ControlAgentConfigRevision = z.infer<
  typeof ControlAgentConfigRevisionSchema
>;
