import type { KlueClient } from "../client";

export interface KlueIntel {
  id: string;
  title: string;
  content: string;
  source: string;
  source_url: string | null;
  competitor_ids: string[];
  competitor_names: string[];
  intel_type: string;
  tags: string[];
  submitted_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface IntelResponse {
  intel: KlueIntel[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListIntelOptions {
  updatedSince?: string;
}

export async function* listIntel(
  client: KlueClient,
  options: ListIntelOptions = {}
): AsyncGenerator<KlueIntel[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<IntelResponse>("/intel", params);

    if (response.intel.length > 0) {
      yield response.intel;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
