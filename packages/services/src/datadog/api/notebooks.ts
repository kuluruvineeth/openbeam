import type { DatadogClient } from "../client";

export interface DatadogNotebook {
  id: number;
  type: "notebooks";
  attributes: {
    name: string;
    author: {
      handle: string;
      name: string | null;
    };
    cells: DatadogNotebookCell[];
    time: {
      live_span?: string;
    };
    status: string;
    created: string;
    modified: string;
    metadata?: {
      type?: string;
    };
  };
}

export interface DatadogNotebookCell {
  id: string;
  type: string;
  attributes: {
    definition: {
      type: string;
      text?: string;
      requests?: unknown[];
    };
  };
}

interface NotebookListResponse {
  data: DatadogNotebook[];
  meta?: {
    page?: {
      total_count: number;
      total_filtered_count: number;
    };
  };
}

export async function* listNotebooks(
  client: DatadogClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<DatadogNotebook[], void, undefined> {
  const { pageSize = 100 } = options;
  let start = 0;

  while (true) {
    const response = await client.get<NotebookListResponse>(
      "/api/v1/notebooks",
      {
        start: String(start),
        count: String(pageSize),
      }
    );

    const notebooks = response.data ?? [];
    if (notebooks.length > 0) {
      yield notebooks;
    }

    start += notebooks.length;
    const total = response.meta?.page?.total_filtered_count ?? 0;

    if (notebooks.length < pageSize || start >= total) {
      break;
    }
  }
}
