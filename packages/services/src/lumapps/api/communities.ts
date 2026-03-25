import type { LumAppsClient } from "../client";

export interface LumAppsCommunity {
  id: string;
  name: string;
  description?: string;
  privacy: string;
  memberCount?: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommunityListResponse {
  items: LumAppsCommunity[];
  cursor?: string;
  more?: boolean;
}

interface ListCommunitiesOptions {
  maxResults?: number;
  cursor?: string;
}

export async function* listCommunities(
  client: LumAppsClient,
  options: ListCommunitiesOptions = {}
): AsyncGenerator<LumAppsCommunity[], void, undefined> {
  const { maxResults = 50 } = options;
  let cursor = options.cursor;

  while (true) {
    const params: Record<string, string> = {
      maxResults: String(maxResults),
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await client.get<CommunityListResponse>(
      "/communities",
      params
    );
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
