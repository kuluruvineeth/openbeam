import type { AsanaClient } from "../client";

type AsanaWorkspace = {
  gid: string;
  name: string;
  resource_type: string;
};

export type WorkspaceListResult = {
  success: boolean;
  workspaces?: Array<{ gid: string; name: string }>;
  error?: string;
};

export type ProjectListResult = {
  success: boolean;
  projects?: Array<{ gid: string; name: string; archived: boolean }>;
  error?: string;
};

export async function listAsanaWorkspaces(
  client: AsanaClient
): Promise<WorkspaceListResult> {
  try {
    const result = await client.get<{ data: AsanaWorkspace[] }>("/workspaces", {
      opt_fields: "gid,name",
      limit: "100",
    });
    return {
      success: true,
      workspaces: result.data.map((w) => ({ gid: w.gid, name: w.name })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list workspaces",
    };
  }
}

export async function listAsanaProjects(
  client: AsanaClient,
  workspaceGid: string
): Promise<ProjectListResult> {
  try {
    const result = await client.get<{
      data: Array<{ gid: string; name: string; archived: boolean }>;
    }>("/projects", {
      workspace: workspaceGid,
      opt_fields: "gid,name,archived",
      limit: "100",
    });
    return {
      success: true,
      projects: result.data.map((p) => ({
        gid: p.gid,
        name: p.name,
        archived: p.archived,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list projects",
    };
  }
}
