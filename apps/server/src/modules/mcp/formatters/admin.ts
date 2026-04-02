import { relativeTime } from "./helpers";

type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  revoked: boolean;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
};

export function formatApiKeyList(keys: ApiKeySummary[]): string {
  if (keys.length === 0) {
    return "No API keys found.\n\nTo create one: apikey_create with a name.";
  }

  const active = keys.filter((k) => !k.revoked);
  const revoked = keys.filter((k) => k.revoked);

  const rows = keys.map((k) => {
    const status = k.revoked ? "[REVOKED]" : "[ACTIVE]";
    const lastUsed = k.lastUsedAt
      ? `last used ${relativeTime(k.lastUsedAt)}`
      : "never used";
    const scopes =
      k.scopes.length > 3
        ? `${k.scopes.slice(0, 3).join(", ")} +${k.scopes.length - 3} more`
        : k.scopes.join(", ");
    return `${status} ${k.name} (${k.prefix}...)\n  Scopes: ${scopes} | ${lastUsed}`;
  });

  const parts = [
    `${keys.length} API keys (${active.length} active, ${revoked.length} revoked):`,
    "",
    ...rows,
    "",
    "Next steps:",
    "- Create a new key: apikey_create with a name.",
    "- Revoke a key: apikey_revoke with the key ID.",
  ];

  return parts.join("\n");
}

export function formatApiKeyCreated(key: {
  id: string;
  key: string;
  prefix: string;
}): string {
  return [
    "API key created successfully.",
    "",
    `Key: ${key.key}`,
    "",
    "IMPORTANT: Copy this key now. It cannot be retrieved again.",
    "",
    "Next steps:",
    "- List all keys: apikey_list.",
    `- Revoke this key later: apikey_revoke with ID ${key.id}.`,
  ].join("\n");
}

export function formatApiKeyRevoked(apiKeyId: string): string {
  return [
    `API key ${apiKeyId} has been revoked.`,
    "",
    "Any requests using this key will now be rejected. This action is irreversible.",
    "",
    "Next steps:",
    "- List remaining keys: apikey_list.",
    "- Create a replacement: apikey_create with a name.",
  ].join("\n");
}

type InviteSummary = {
  email: string;
  role: string;
  code: string;
};

export function formatInviteSent(invite: InviteSummary): string {
  return [
    `Invite sent to ${invite.email} as ${invite.role}.`,
    "",
    `Invite code: ${invite.code}`,
    "",
    "The invited user can use this code to join the team.",
    "",
    "Next steps:",
    "- View current members: team_members.",
    "- Change their role after they join: team_update_role.",
  ].join("\n");
}

type RoleUpdate = {
  userId: string;
  role: string;
};

export function formatRoleUpdated(update: RoleUpdate): string {
  return [
    `Role updated to ${update.role} for user ${update.userId}.`,
    "",
    "Next steps:",
    "- View current members: team_members.",
    "- Remove this member: team_remove_member with their userId.",
  ].join("\n");
}

export function formatMemberRemoved(displayName: string): string {
  return [
    `${displayName} has been removed from the team.`,
    "",
    "They will no longer have access to team data. This cannot be undone.",
    "",
    "Next steps:",
    "- View remaining members: team_members.",
    "- Re-invite them: team_invite_member with their email.",
  ].join("\n");
}

type McpConfigResult = {
  client: string;
  config: string;
  configPath?: string | null;
  apiKeyHint: string;
};

export function formatMcpConfig(result: McpConfigResult): string {
  const parts = [`MCP configuration for ${result.client}:`, "", result.config];

  if (result.configPath) {
    parts.push("", `Config file: ${result.configPath}`);
  }

  parts.push("", result.apiKeyHint);

  parts.push(
    "",
    "Next steps:",
    "- Generate config for another client: mcp_config_generate.",
    "- Create an API key: apikey_create.",
    "- List existing keys: apikey_list."
  );

  return parts.join("\n");
}
