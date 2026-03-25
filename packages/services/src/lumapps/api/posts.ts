import type { LumAppsClient } from "../client";

export interface LumAppsPost {
  id: string;
  content: string;
  author?: {
    id: string;
    email?: string;
    fullName?: string;
  };
  community?: {
    id: string;
    name?: string;
  };
  reactions?: number;
  comments?: number;
  attachments?: {
    id: string;
    name?: string;
    url?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface PostListResponse {
  items: LumAppsPost[];
  cursor?: string;
  more?: boolean;
}

interface ListPostsOptions {
  communityId?: string;
  maxResults?: number;
  cursor?: string;
}

export async function* listPosts(
  client: LumAppsClient,
  options: ListPostsOptions = {}
): AsyncGenerator<LumAppsPost[], void, undefined> {
  const { communityId, maxResults = 50 } = options;
  let cursor = options.cursor;

  const basePath = communityId ? `/communities/${communityId}/posts` : "/posts";

  while (true) {
    const params: Record<string, string> = {
      maxResults: String(maxResults),
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await client.get<PostListResponse>(basePath, params);
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
