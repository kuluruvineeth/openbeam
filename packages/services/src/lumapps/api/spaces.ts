import type { LumAppsClient } from "../client";

export interface LumAppsSpace {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

interface SpaceListResponse {
  items: LumAppsSpace[];
  cursor?: string;
  more?: boolean;
}

interface ListSpacesOptions {
  maxResults?: number;
  cursor?: string;
}

export async function* listSpaces(
  client: LumAppsClient,
  options: ListSpacesOptions = {}
): AsyncGenerator<LumAppsSpace[], void, undefined> {
  const { maxResults = 50 } = options;
  let cursor = options.cursor;

  while (true) {
    const params: Record<string, string> = {
      maxResults: String(maxResults),
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await client.get<SpaceListResponse>("/spaces", params);
    const items = response.items ?? [];

    if (items.length > 0) {
      yield items;
    }

    if (!(response.more && response.cursor)) {
      break;
    }

    cursor = response.cursor;
  }
}
