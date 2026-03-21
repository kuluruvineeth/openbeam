import type { AtlassianClient } from "../../atlassian/client";

export type ConfluenceSpace = {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  description?: { plain?: { value: string } };
};

export function getSpace(
  client: AtlassianClient,
  spaceId: string
): Promise<ConfluenceSpace> {
  return client.get<ConfluenceSpace>(`/wiki/api/v2/spaces/${spaceId}`);
}

export function listSpaces(
  client: AtlassianClient
): AsyncGenerator<ConfluenceSpace[], void, undefined> {
  return client.paginate<ConfluenceSpace>("/wiki/api/v2/spaces", {
    status: "current",
  });
}
