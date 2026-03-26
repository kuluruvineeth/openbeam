import type { SimpplrClient } from "../client";

export interface SimpplrFile {
  id: string;
  title: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  url?: string;
  author?: {
    id: string;
    displayName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FilesResponse {
  data: SimpplrFile[];
  total?: number;
  hasMore?: boolean;
}

interface ListFilesOptions {
  modifiedAfter?: string;
}

export async function* listFiles(
  client: SimpplrClient,
  options: ListFilesOptions = {}
): AsyncGenerator<SimpplrFile[], void, undefined> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const params: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };

    if (options.modifiedAfter) {
      params.modifiedAfter = options.modifiedAfter;
    }

    const response = await client.get<FilesResponse>("/files", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (response.data.length < limit) {
      break;
    }
    offset += limit;
  }
}
