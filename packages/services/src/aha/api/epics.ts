import type { AhaClient } from "../client";

export interface AhaEpic {
  id: string;
  reference_num: string;
  name: string;
  description: {
    body: string;
    created_at: string;
  };
  workflow_status: {
    id: string;
    name: string;
    color: string;
  };
  progress: number;
  progress_source: string;
  color: string;
  product_id: string;
  url: string;
  resource: string;
  created_at: string;
  updated_at: string;
}

interface EpicsResponse {
  epics: AhaEpic[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListEpicsOptions {
  updatedSince?: string;
}

export async function* listEpics(
  client: AhaClient,
  productId: string,
  options: ListEpicsOptions = {}
): AsyncGenerator<AhaEpic[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "200",
    };

    if (options.updatedSince) {
      params.updated_since = options.updatedSince;
    }

    const response = await client.get<EpicsResponse>(
      `/products/${productId}/epics`,
      params
    );

    if (response.epics.length > 0) {
      yield response.epics;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
