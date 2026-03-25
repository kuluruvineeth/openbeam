import type { LoopioClient } from "../client";

export interface LoopioLibraryEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  last_reviewed_at: string | null;
  reviewed_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface LibraryEntriesResponse {
  library_entries: LoopioLibraryEntry[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListLibraryEntriesOptions {
  updatedSince?: string;
}

export async function* listLibraryEntries(
  client: LoopioClient,
  options: ListLibraryEntriesOptions = {}
): AsyncGenerator<LoopioLibraryEntry[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<LibraryEntriesResponse>(
      "/library",
      params
    );

    if (response.library_entries.length > 0) {
      yield response.library_entries;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
