import type { AhaClient } from "../client";

export interface AhaIdea {
  id: string;
  reference_num: string;
  name: string;
  description: {
    body: string;
    created_at: string;
    attachments: unknown[];
  };
  workflow_status: {
    id: string;
    name: string;
    color: string;
  };
  categories: {
    id: string;
    name: string;
  }[];
  visibility: string;
  num_endorsements: number;
  score: number;
  initial_votes: number;
  has_been_promoted: boolean;
  assigned_to_user?: {
    id: string;
    name: string;
    email: string;
  };
  created_by_user?: {
    id: string;
    name: string;
  };
  product_id: string;
  url: string;
  resource: string;
  created_at: string;
  updated_at: string;
}

interface IdeasResponse {
  ideas: AhaIdea[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListIdeasOptions {
  updatedSince?: string;
}

export async function* listIdeas(
  client: AhaClient,
  productId: string,
  options: ListIdeasOptions = {}
): AsyncGenerator<AhaIdea[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "200",
    };

    if (options.updatedSince) {
      params.updated_since = options.updatedSince;
    }

    const response = await client.get<IdeasResponse>(
      `/products/${productId}/ideas`,
      params
    );

    if (response.ideas.length > 0) {
      yield response.ideas;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
