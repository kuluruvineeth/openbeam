import type { AtlassianClient } from "../../atlassian/client";

export type JiraProject = {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  lead?: { accountId: string; displayName?: string };
};

type ProjectSearchResult = {
  values: JiraProject[];
  total: number;
  isLast: boolean;
};

export function listProjects(
  client: AtlassianClient,
  options?: { maxResults?: number; startAt?: number }
): Promise<ProjectSearchResult> {
  return client.get<ProjectSearchResult>("/rest/api/3/project/search", {
    maxResults: String(options?.maxResults ?? 50),
    ...(options?.startAt !== undefined && {
      startAt: String(options.startAt),
    }),
  });
}

export function getProject(
  client: AtlassianClient,
  projectIdOrKey: string
): Promise<JiraProject> {
  return client.get<JiraProject>(
    `/rest/api/3/project/${encodeURIComponent(projectIdOrKey)}`
  );
}
