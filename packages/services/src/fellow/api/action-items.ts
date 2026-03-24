import type { FellowClient } from "../client";

export interface FellowActionItem {
  id: string;
  title: string;
  description?: string;
  assignee?: {
    email: string;
    name?: string;
  };
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  meeting_id?: string;
  meeting_title?: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface ActionItemsResponse {
  results: FellowActionItem[];
  next_cursor?: string;
}

interface ListActionItemsOptions {
  updatedAfter?: string;
}

export async function* listActionItems(
  client: FellowClient,
  options: ListActionItemsOptions = {}
): AsyncGenerator<FellowActionItem[], void, undefined> {
  let cursor: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      limit: "100",
    };

    if (cursor) {
      params.cursor = cursor;
    }

    if (options.updatedAfter) {
      params.updated_after = options.updatedAfter;
    }

    const response = await client.get<ActionItemsResponse>(
      "/action-items",
      params
    );

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next_cursor) {
      break;
    }
    cursor = response.next_cursor;
  }
}
