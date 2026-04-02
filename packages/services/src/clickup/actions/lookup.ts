import type { ClickUpClient } from "../client";

interface LookupResult {
  success: boolean;
  items?: Array<{ id: string; name: string }>;
  error?: string;
}

export async function listWorkspaces(
  client: ClickUpClient
): Promise<LookupResult> {
  try {
    const data = await client.get<{
      teams: Array<{ id: string; name: string }>;
    }>("/team");

    return {
      success: true,
      items: data.teams.map((t) => ({ id: t.id, name: t.name })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list workspaces",
    };
  }
}

export async function listSpaces(
  client: ClickUpClient,
  params: { teamId: string }
): Promise<LookupResult> {
  try {
    const data = await client.get<{
      spaces: Array<{ id: string; name: string }>;
    }>(`/team/${params.teamId}/space`);

    return {
      success: true,
      items: data.spaces.map((s) => ({ id: s.id, name: s.name })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list spaces",
    };
  }
}

export async function listFolders(
  client: ClickUpClient,
  params: { spaceId: string }
): Promise<LookupResult> {
  try {
    const data = await client.get<{
      folders: Array<{ id: string; name: string }>;
    }>(`/space/${params.spaceId}/folder`);

    return {
      success: true,
      items: data.folders.map((f) => ({ id: f.id, name: f.name })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list folders",
    };
  }
}

export async function listLists(
  client: ClickUpClient,
  params: { spaceId?: string; folderId?: string }
): Promise<LookupResult> {
  try {
    const path = params.folderId
      ? `/folder/${params.folderId}/list`
      : `/space/${params.spaceId}/list`;

    const data = await client.get<{
      lists: Array<{ id: string; name: string }>;
    }>(path);

    return {
      success: true,
      items: data.lists.map((l) => ({ id: l.id, name: l.name })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list lists",
    };
  }
}
