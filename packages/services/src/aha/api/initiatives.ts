import type { AhaClient } from "../client";

export interface AhaInitiative {
  id: string;
  name: string;
  description: {
    body: string;
    created_at: string;
  };
  status: string;
  color: string;
  progress: number;
  progress_source: string;
  effort?: {
    value: number;
    text: string;
  };
  value?: {
    value: number;
    text: string;
  };
  url: string;
  resource: string;
  created_at: string;
  updated_at: string;
}

interface InitiativesResponse {
  initiatives: AhaInitiative[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListInitiativesOptions {
  updatedSince?: string;
}

export async function* listInitiatives(
  client: AhaClient,
  productId: string,
  options: ListInitiativesOptions = {}
): AsyncGenerator<AhaInitiative[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "200",
    };

    if (options.updatedSince) {
      params.updated_since = options.updatedSince;
    }

    const response = await client.get<InitiativesResponse>(
      `/products/${productId}/initiatives`,
      params
    );

    if (response.initiatives.length > 0) {
      yield response.initiatives;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
