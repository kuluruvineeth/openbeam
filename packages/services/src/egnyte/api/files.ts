import type { EgnyteClient, EgnyteFileEntry } from "../client";

type FolderPage = {
  entries: EgnyteFileEntry[];
  hasMore: boolean;
};

const PAGE_SIZE = 500;

export async function* listAllFolderItems(
  client: EgnyteClient,
  folderPath: string,
  recursive: boolean
): AsyncGenerator<FolderPage, void, undefined> {
  const queue: string[] = [folderPath];

  while (queue.length > 0) {
    const currentPath = queue.shift() as string;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await client.listFolder(currentPath, offset, PAGE_SIZE);
      const entries: EgnyteFileEntry[] = [];

      if (response.folders) {
        for (const folder of response.folders) {
          entries.push(folder);
          if (recursive) {
            queue.push(folder.path);
          }
        }
      }

      if (response.files) {
        for (const file of response.files) {
          entries.push(file);
        }
      }

      const totalItems =
        (response.folders?.length ?? 0) + (response.files?.length ?? 0);

      yield {
        entries,
        hasMore: totalItems === PAGE_SIZE || queue.length > 0,
      };

      hasMore = totalItems === PAGE_SIZE;
      offset += totalItems;
    }
  }
}
