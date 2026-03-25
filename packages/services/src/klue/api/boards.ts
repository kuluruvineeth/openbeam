import type { KlueClient } from "../client";

export interface KlueBoard {
  id: string;
  name: string;
  description: string;
  card_count: number;
  owner: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface BoardsResponse {
  boards: KlueBoard[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListBoardsOptions {
  updatedSince?: string;
}

export async function* listBoards(
  client: KlueClient,
  options: ListBoardsOptions = {}
): AsyncGenerator<KlueBoard[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<BoardsResponse>("/boards", params);

    if (response.boards.length > 0) {
      yield response.boards;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
