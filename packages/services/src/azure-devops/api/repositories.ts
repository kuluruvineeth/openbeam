import type { AzureDevOpsClient } from "../client";

export type AzureDevOpsRepository = {
  id: string;
  name: string;
  url: string;
  webUrl?: string;
  defaultBranch?: string;
  size: number;
  project: {
    id: string;
    name: string;
  };
};

type RepositoryListResponse = {
  count: number;
  value: AzureDevOpsRepository[];
};

export async function listRepositories(
  client: AzureDevOpsClient,
  project: string
): Promise<AzureDevOpsRepository[]> {
  const res = await client.get<RepositoryListResponse>(
    `/${encodeURIComponent(project)}/_apis/git/repositories`
  );
  return res.value;
}
