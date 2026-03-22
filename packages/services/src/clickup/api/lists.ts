import type {
  ClickUpFolder,
  ClickUpList,
} from "@openbeam/types/services/connectors/clickup";
import type { ClickUpClient } from "../client";

interface FoldersResponse {
  folders: ClickUpFolder[];
}

interface FolderlessListsResponse {
  lists: ClickUpList[];
}

export async function* getAllFolders(
  client: ClickUpClient,
  spaceId: string
): AsyncGenerator<ClickUpFolder> {
  const response = await client.get<FoldersResponse>(
    `/space/${spaceId}/folder`,
    { archived: "false" }
  );

  for (const folder of response.folders) {
    yield folder;
  }
}

export async function* getFolderLists(
  client: ClickUpClient,
  folderId: string
): AsyncGenerator<ClickUpList> {
  const response = await client.get<{ lists: ClickUpList[] }>(
    `/folder/${folderId}/list`,
    { archived: "false" }
  );

  for (const list of response.lists) {
    yield list;
  }
}

export async function* getFolderlessLists(
  client: ClickUpClient,
  spaceId: string
): AsyncGenerator<ClickUpList> {
  const response = await client.get<FolderlessListsResponse>(
    `/space/${spaceId}/list`,
    { archived: "false" }
  );

  for (const list of response.lists) {
    yield list;
  }
}

export async function* getAllListsInSpace(
  client: ClickUpClient,
  spaceId: string
): AsyncGenerator<ClickUpList> {
  for await (const folder of getAllFolders(client, spaceId)) {
    for await (const list of getFolderLists(client, folder.id)) {
      yield {
        ...list,
        folder: { id: folder.id, name: folder.name },
        space: { id: spaceId },
      };
    }
  }

  for await (const list of getFolderlessLists(client, spaceId)) {
    yield { ...list, space: { id: spaceId } };
  }
}
