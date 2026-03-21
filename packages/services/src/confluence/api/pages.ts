import type { AtlassianClient } from "../../atlassian/client";

export type ConfluencePageResponse = {
  id: string;
  status: string;
  title: string;
  spaceId: string;
  version?: { number: number; message?: string; createdAt: string };
  body?: { storage?: { value: string } };
  _links?: { webui?: string; tinyui?: string };
};

type CreatePageRequest = {
  spaceId: string;
  title: string;
  body: { representation: string; value: string };
  parentId?: string;
  status?: string;
};

type UpdatePageRequest = {
  id: string;
  title: string;
  body: { representation: string; value: string };
  version: { number: number; message?: string };
  status: string;
};

export function getPage(
  client: AtlassianClient,
  pageId: string
): Promise<ConfluencePageResponse> {
  return client.get<ConfluencePageResponse>(`/wiki/api/v2/pages/${pageId}`, {
    "body-format": "storage",
  });
}

export function createPage(
  client: AtlassianClient,
  params: CreatePageRequest
): Promise<ConfluencePageResponse> {
  return client.post<ConfluencePageResponse>("/wiki/api/v2/pages", params);
}

export function updatePage(
  client: AtlassianClient,
  pageId: string,
  params: UpdatePageRequest
): Promise<ConfluencePageResponse> {
  return client.post<ConfluencePageResponse>(
    `/wiki/api/v2/pages/${pageId}`,
    params
  );
}
