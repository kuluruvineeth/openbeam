import type { KlueClient } from "../client";

export interface KlueCompetitor {
  id: string;
  name: string;
  description: string;
  website: string;
  status: string;
  win_rate: number;
  tags: string[];
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface CompetitorsResponse {
  competitors: KlueCompetitor[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListCompetitorsOptions {
  updatedSince?: string;
}

export async function* listCompetitors(
  client: KlueClient,
  options: ListCompetitorsOptions = {}
): AsyncGenerator<KlueCompetitor[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<CompetitorsResponse>(
      "/competitors",
      params
    );

    if (response.competitors.length > 0) {
      yield response.competitors;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
