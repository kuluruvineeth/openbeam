import type { BenchlingClient } from "../client";

export interface BenchlingFolder {
  id: string;
  name: string;
  parentFolderId?: string | null;
  projectId?: string | null;
  createdAt: string;
  modifiedAt: string;
  archiveRecord?: { reason: string } | null;
  webURL: string;
}

interface FoldersResponse {
  folders: BenchlingFolder[];
  nextToken?: string;
}

interface ListFoldersOptions {
  modifiedAt?: string;
}

export async function* listFolders(
  client: BenchlingClient,
  options: ListFoldersOptions = {}
): AsyncGenerator<BenchlingFolder[], void, undefined> {
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      pageSize: "100",
      sort: "modifiedAt:asc",
    };

    if (nextToken) {
      params.nextToken = nextToken;
    }

    if (options.modifiedAt) {
      params["modifiedAt.gte"] = options.modifiedAt;
    }

    const response = await client.get<FoldersResponse>("/folders", params);

    if (response.folders.length > 0) {
      yield response.folders;
    }

    if (!response.nextToken) {
      break;
    }
    nextToken = response.nextToken;
  }
}
