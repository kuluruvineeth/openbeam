import type { SeismicClient } from "../client";

export type SeismicWorkspace = {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  modifiedAt: string;
};

export function listAllWorkspaces(
  client: SeismicClient,
  params?: Record<string, string>
): AsyncGenerator<SeismicWorkspace[], void, undefined> {
  return client.listAll<SeismicWorkspace>("/teamsites", params);
}

export function getWorkspace(
  client: SeismicClient,
  workspaceId: string
): Promise<SeismicWorkspace> {
  return client.get<SeismicWorkspace>(`/teamsites/${workspaceId}`);
}
