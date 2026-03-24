import type { AhaClient } from "../client";

export interface AhaFeature {
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
  assigned_to_user?: {
    id: string;
    name: string;
    email: string;
  };
  created_by_user?: {
    id: string;
    name: string;
  };
  due_date?: string;
  start_date?: string;
  release?: {
    id: string;
    reference_num: string;
    name: string;
  };
  initiative?: {
    id: string;
    name: string;
  };
  epic?: {
    id: string;
    reference_num: string;
    name: string;
  };
  score: number;
  tags: string[];
  product_id: string;
  url: string;
  resource: string;
  created_at: string;
  updated_at: string;
}

interface FeaturesResponse {
  features: AhaFeature[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListFeaturesOptions {
  updatedSince?: string;
}

export async function* listFeatures(
  client: AhaClient,
  productId: string,
  options: ListFeaturesOptions = {}
): AsyncGenerator<AhaFeature[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "200",
    };

    if (options.updatedSince) {
      params.updated_since = options.updatedSince;
    }

    const response = await client.get<FeaturesResponse>(
      `/products/${productId}/features`,
      params
    );

    if (response.features.length > 0) {
      yield response.features;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
