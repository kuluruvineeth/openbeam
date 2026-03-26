import type { SeismicClient } from "../client";

export type SeismicContent = {
  id: string;
  name: string;
  type: string;
  version: number;
  versionId?: string;
  url?: string;
  thumbnailUrl?: string;
  teamsiteId?: string;
  teamsiteName?: string;
  repositoryName?: string;
  format?: string;
  size?: number;
  description?: string;
  tags?: string[];
  createdAt: string;
  modifiedAt: string;
  createdBy?: string;
  modifiedBy?: string;
  properties?: Record<string, unknown>;
};

export function listAllContents(
  client: SeismicClient,
  params?: Record<string, string>
): AsyncGenerator<SeismicContent[], void, undefined> {
  return client.listAll<SeismicContent>("/contents", params);
}

export function getContent(
  client: SeismicClient,
  contentId: string
): Promise<SeismicContent> {
  return client.get<SeismicContent>(`/contents/${contentId}`);
}
