import type { DropboxClient, DropboxEntry } from "../client";

type ListFolderPage = {
  entries: DropboxEntry[];
  cursor: string;
  hasMore: boolean;
};

export async function* listAllFiles(
  client: DropboxClient,
  path = "",
  recursive = true
): AsyncGenerator<ListFolderPage, void, undefined> {
  let result = await client.listFolder(path, recursive);

  yield {
    entries: result.entries,
    cursor: result.cursor,
    hasMore: result.has_more,
  };

  while (result.has_more) {
    result = await client.listFolderContinue(result.cursor);

    yield {
      entries: result.entries,
      cursor: result.cursor,
      hasMore: result.has_more,
    };
  }
}

export async function* listFolderChanges(
  client: DropboxClient,
  cursor: string
): AsyncGenerator<ListFolderPage, void, undefined> {
  let result = await client.listFolderContinue(cursor);

  yield {
    entries: result.entries,
    cursor: result.cursor,
    hasMore: result.has_more,
  };

  while (result.has_more) {
    result = await client.listFolderContinue(result.cursor);

    yield {
      entries: result.entries,
      cursor: result.cursor,
      hasMore: result.has_more,
    };
  }
}
