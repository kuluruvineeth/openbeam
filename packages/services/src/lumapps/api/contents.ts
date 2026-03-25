import type { LumAppsClient } from "../client";

export interface LumAppsContent {
  id: string;
  title: string;
  slug?: string;
  type: string;
  status: string;
  excerpt?: string;
  content?: string;
  author?: {
    id: string;
    email?: string;
    fullName?: string;
  };
  space?: {
    id: string;
    name?: string;
  };
  tags?: string[];
  language?: string;
  publicationDate?: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

interface ContentListResponse {
  items: LumAppsContent[];
  cursor?: string;
  more?: boolean;
}

interface ContentDetailResponse extends LumAppsContent {
  body?: string;
}

interface ListContentsOptions {
  maxResults?: number;
  cursor?: string;
  type?: string;
  status?: string;
}

export async function* listContents(
  client: LumAppsClient,
  options: ListContentsOptions = {}
): AsyncGenerator<LumAppsContent[], void, undefined> {
  const { maxResults = 50, type, status } = options;
  let cursor = options.cursor;

  while (true) {
    const params: Record<string, string> = {
      maxResults: String(maxResults),
    };
    if (cursor) {
      params.cursor = cursor;
    }
    if (type) {
      params.type = type;
    }
    if (status) {
      params.status = status;
    }

    const response = await client.get<ContentListResponse>("/contents", params);
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

export function getContentDetail(
  client: LumAppsClient,
  contentId: string
): Promise<ContentDetailResponse> {
  return client.get<ContentDetailResponse>(`/contents/${contentId}`);
}
