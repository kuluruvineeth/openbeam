import type { AzureDevOpsClient } from "../client";

export type AzureDevOpsProject = {
  id: string;
  name: string;
  description?: string;
  state: string;
  url: string;
  lastUpdateTime: string;
};

type ProjectListResponse = {
  count: number;
  value: AzureDevOpsProject[];
};

export async function listProjects(
  client: AzureDevOpsClient
): Promise<AzureDevOpsProject[]> {
  const res = await client.get<ProjectListResponse>("/_apis/projects", {
    $top: "500",
    stateFilter: "wellFormed",
  });
  return res.value;
}
