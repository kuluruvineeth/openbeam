import type { JFrogClient } from "../client";

export interface JFrogRepository {
  key: string;
  description: string;
  type: string;
  url: string;
  packageType: string;
  layoutRef?: string;
  environments?: string[];
}

interface RepositoryDetailResponse {
  key: string;
  description: string;
  rclass: string;
  url: string;
  packageType: string;
  layoutRef?: string;
  environments?: string[];
  dockerApiVersion?: string;
  enableComposedBuildNumberedDownload?: boolean;
}

export async function listRepositories(
  client: JFrogClient
): Promise<JFrogRepository[]> {
  const response = await client.get<RepositoryDetailResponse[]>(
    "/artifactory/api/repositories"
  );

  return response.map((repo) => ({
    key: repo.key,
    description: repo.description ?? "",
    type: repo.rclass,
    url: repo.url ?? `${client.instanceUrl}/artifactory/${repo.key}`,
    packageType: repo.packageType,
    layoutRef: repo.layoutRef,
    environments: repo.environments,
  }));
}

export async function getRepository(
  client: JFrogClient,
  repoKey: string
): Promise<JFrogRepository> {
  const repo = await client.get<RepositoryDetailResponse>(
    `/artifactory/api/repositories/${repoKey}`
  );

  return {
    key: repo.key,
    description: repo.description ?? "",
    type: repo.rclass,
    url: repo.url ?? `${client.instanceUrl}/artifactory/${repo.key}`,
    packageType: repo.packageType,
    layoutRef: repo.layoutRef,
    environments: repo.environments,
  };
}
