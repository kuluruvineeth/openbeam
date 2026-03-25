import type { KlueClient } from "../client";

export interface KlueBattlecard {
  id: string;
  title: string;
  content: string;
  competitor_id: string;
  competitor_name: string;
  status: string;
  card_type: string;
  last_reviewed_at: string | null;
  last_reviewed_by: {
    id: string;
    name: string;
  } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface BattlecardsResponse {
  battlecards: KlueBattlecard[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListBattlecardsOptions {
  updatedSince?: string;
}

export async function* listBattlecards(
  client: KlueClient,
  options: ListBattlecardsOptions = {}
): AsyncGenerator<KlueBattlecard[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<BattlecardsResponse>(
      "/battlecards",
      params
    );

    if (response.battlecards.length > 0) {
      yield response.battlecards;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
