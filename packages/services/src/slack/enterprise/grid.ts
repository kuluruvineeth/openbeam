import type { SlackClient } from "../client";
import type {
  EnterpriseError,
  EnterpriseInfo,
  EnterpriseSyncConfig,
  EnterpriseSyncResult,
  EnterpriseUser,
  EnterpriseWorkspace,
  WorkspaceSyncResult,
} from "./types";

interface AdminTeamsListResponse {
  ok: boolean;
  teams?: Array<{
    id: string;
    name: string;
    domain?: string;
    discoverability?: string;
    primary_owner?: { user_id: string };
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface AdminUsersListResponse {
  ok: boolean;
  users?: Array<{
    id: string;
    email?: string;
    username?: string;
    full_name?: string;
    is_admin?: boolean;
    is_owner?: boolean;
    teams?: Array<{ team_id: string }>;
    enterprise_user?: {
      enterprise_id: string;
      id: string;
    };
    scim_id?: string;
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface AuthTestResponse {
  ok: boolean;
  team_id?: string;
  team?: string;
  enterprise_id?: string;
  is_enterprise_install?: boolean;
  error?: string;
}

export async function isEnterpriseInstall(
  client: SlackClient
): Promise<boolean> {
  const result = await client.call<AuthTestResponse>("auth.test", {});
  return result.is_enterprise_install === true;
}

export async function getEnterpriseInfo(
  client: SlackClient
): Promise<EnterpriseInfo | null> {
  const authResult = await client.call<AuthTestResponse>("auth.test", {});

  if (!authResult.enterprise_id) {
    return null;
  }

  const workspaces = await listEnterpriseWorkspaces(client);

  return {
    id: authResult.enterprise_id,
    name: authResult.team ?? "Enterprise",
    isEnterprise: true,
    workspaces,
    primaryWorkspaceId: authResult.team_id,
  };
}

export async function listEnterpriseWorkspaces(
  client: SlackClient
): Promise<EnterpriseWorkspace[]> {
  const workspaces: EnterpriseWorkspace[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.call<AdminTeamsListResponse>(
      "admin.teams.list",
      {
        limit: 100,
        cursor,
      }
    );

    if (!(response.ok && response.teams)) {
      break;
    }

    for (const team of response.teams) {
      workspaces.push({
        id: team.id,
        name: team.name,
        domain: team.domain,
        isActive: true,
        syncEnabled: true,
      });
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return workspaces;
}

export async function listEnterpriseUsers(
  client: SlackClient,
  teamId?: string
): Promise<EnterpriseUser[]> {
  const users: EnterpriseUser[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, unknown> = {
      limit: 200,
      cursor,
    };

    if (teamId) {
      params.team_id = teamId;
    }

    const response = await client.call<AdminUsersListResponse>(
      "admin.users.list",
      params
    );

    if (!(response.ok && response.users)) {
      break;
    }

    for (const user of response.users) {
      const enterpriseId = user.enterprise_user?.enterprise_id ?? "";

      users.push({
        id: user.id,
        enterpriseId,
        email: user.email,
        displayName: user.full_name ?? user.username,
        isAdmin: user.is_admin ?? false,
        isOwner: user.is_owner ?? false,
        teamIds: user.teams?.map((t) => t.team_id) ?? [],
        scimId: user.scim_id,
      });
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return users;
}

function createFailedWorkspaceResult(
  workspace: EnterpriseWorkspace,
  error: unknown
): WorkspaceSyncResult {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    success: false,
    usersIndexed: 0,
    channelsIndexed: 0,
    messagesIndexed: 0,
    filesIndexed: 0,
    errors: [errorMessage],
    duration: 0,
  };
}

function createWorkspaceError(
  workspace: EnterpriseWorkspace,
  code: string,
  error: unknown
): EnterpriseError {
  return {
    workspaceId: workspace.id,
    code,
    message: error instanceof Error ? error.message : "Unknown error",
    recoverable: true,
  };
}

export async function syncEnterprise(
  client: SlackClient,
  config: EnterpriseSyncConfig,
  onProgress?: (workspace: string, progress: number) => void
): Promise<EnterpriseSyncResult> {
  const startTime = Date.now();
  const errors: EnterpriseError[] = [];
  const workspaceResults = new Map<string, WorkspaceSyncResult>();

  const workspaces = await listEnterpriseWorkspaces(client).catch(
    (error): EnterpriseWorkspace[] => {
      errors.push({
        code: "WORKSPACE_LIST_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        recoverable: false,
      });
      return [];
    }
  );

  if (workspaces.length === 0 && errors.length > 0) {
    return {
      enterpriseId: config.enterpriseId,
      workspacesProcessed: 0,
      workspaceResults,
      totalUsers: 0,
      totalChannels: 0,
      totalMessages: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }

  const targetWorkspaces = filterWorkspaces(workspaces, config);
  let totalUsers = 0;
  let totalChannels = 0;
  let totalMessages = 0;

  for (let i = 0; i < targetWorkspaces.length; i++) {
    const workspace = targetWorkspaces[i];
    if (!workspace) {
      continue;
    }

    onProgress?.(workspace.name, (i / targetWorkspaces.length) * 100);

    try {
      const result = await syncWorkspace(client, workspace, config);
      workspaceResults.set(workspace.id, result);

      totalUsers += result.usersIndexed;
      totalChannels += result.channelsIndexed;
      totalMessages += result.messagesIndexed;

      if (!result.success) {
        errors.push({
          workspaceId: workspace.id,
          code: "WORKSPACE_SYNC_PARTIAL",
          message: result.errors.join("; "),
          recoverable: true,
        });
      }
    } catch (error) {
      errors.push(
        createWorkspaceError(workspace, "WORKSPACE_SYNC_FAILED", error)
      );
      workspaceResults.set(
        workspace.id,
        createFailedWorkspaceResult(workspace, error)
      );
    }
  }

  return {
    enterpriseId: config.enterpriseId,
    workspacesProcessed: targetWorkspaces.length,
    workspaceResults,
    totalUsers,
    totalChannels,
    totalMessages,
    errors,
    duration: Date.now() - startTime,
  };
}

async function syncWorkspace(
  client: SlackClient,
  workspace: EnterpriseWorkspace,
  config: EnterpriseSyncConfig
): Promise<WorkspaceSyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let usersIndexed = 0;
  const channelsIndexed = 0;
  const messagesIndexed = 0;
  const filesIndexed = 0;

  if (config.syncUsers) {
    try {
      const users = await listEnterpriseUsers(client, workspace.id);
      usersIndexed = users.length;
    } catch (error) {
      errors.push(
        `Users: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    success: errors.length === 0,
    usersIndexed,
    channelsIndexed,
    messagesIndexed,
    filesIndexed,
    errors,
    duration: Date.now() - startTime,
  };
}

function filterWorkspaces(
  workspaces: EnterpriseWorkspace[],
  config: EnterpriseSyncConfig
): EnterpriseWorkspace[] {
  if (config.syncAllWorkspaces) {
    return workspaces.filter(
      (w) =>
        w.isActive &&
        w.syncEnabled &&
        !config.excludedWorkspaceIds.includes(w.id)
    );
  }

  return workspaces.filter(
    (w) =>
      w.isActive &&
      config.includedWorkspaceIds.includes(w.id) &&
      !config.excludedWorkspaceIds.includes(w.id)
  );
}

export function createDefaultSyncConfig(
  enterpriseId: string
): EnterpriseSyncConfig {
  return {
    enterpriseId,
    syncAllWorkspaces: true,
    includedWorkspaceIds: [],
    excludedWorkspaceIds: [],
    syncUsers: true,
    syncChannels: true,
    syncMessages: true,
    syncFiles: true,
    crossWorkspaceChannels: true,
  };
}

export function validateEnterpriseScopes(scopes: string[]): {
  valid: boolean;
  missing: string[];
} {
  const required = ["admin.teams:read"];
  const missing = required.filter((s) => !scopes.includes(s));

  return {
    valid: missing.length === 0,
    missing,
  };
}
