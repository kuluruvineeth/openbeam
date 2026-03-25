import type { InsidedClient } from "../client";

export interface InsidedUser {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface InsidedCategory {
  id: string;
  name: string;
  slug: string;
}

export interface InsidedPost {
  id: string;
  title: string;
  content: string;
  content_html?: string;
  author: InsidedUser;
  category: InsidedCategory;
  reply_count: number;
  reaction_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  status: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface PostsResponse {
  data: InsidedPost[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

interface ListPostsOptions {
  updatedSince?: string;
}

export async function* listPosts(
  client: InsidedClient,
  options: ListPostsOptions = {}
): AsyncGenerator<InsidedPost[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
      sort: "updated_at",
      order: "desc",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<PostsResponse>("/posts", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (page >= response.meta.total_pages) {
      break;
    }
    page += 1;
  }
}
