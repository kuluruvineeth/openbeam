import type { AhaClient } from "../client";

export interface AhaRelease {
  id: string;
  reference_num: string;
  name: string;
  release_date?: string;
  released: boolean;
  parking_lot: boolean;
  theme?: {
    body: string;
  };
  workflow_status: {
    id: string;
    name: string;
    color: string;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  progress: number;
  progress_source: string;
  product_id: string;
  url: string;
  resource: string;
  created_at: string;
  updated_at: string;
}

interface ReleasesResponse {
  releases: AhaRelease[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListReleasesOptions {
  updatedSince?: string;
}

export async function* listReleases(
  client: AhaClient,
  productId: string,
  options: ListReleasesOptions = {}
): AsyncGenerator<AhaRelease[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "200",
    };

    if (options.updatedSince) {
      params.updated_since = options.updatedSince;
    }

    const response = await client.get<ReleasesResponse>(
      `/products/${productId}/releases`,
      params
    );

    if (response.releases.length > 0) {
      yield response.releases;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
