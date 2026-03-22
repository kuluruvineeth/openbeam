import type { MondayItem } from "@openbeam/types/services/connectors/monday";
import type { MondayClient } from "../client";

const ITEMS_PAGE_QUERY = `
  query GetBoardItems($boardId: [ID!]!, $limit: Int!) {
    boards(ids: $boardId) {
      items_page(limit: $limit) {
        cursor
        items {
          id
          name
          state
          created_at
          updated_at
          url
          group {
            id
            title
            color
          }
          column_values {
            id
            title
            text
            type
            value
          }
          creator {
            id
            name
            email
            photo_thumb_small
          }
          board {
            id
            name
          }
        }
      }
    }
  }
`;

const NEXT_ITEMS_PAGE_QUERY = `
  query GetNextItems($cursor: String!, $limit: Int!) {
    next_items_page(cursor: $cursor, limit: $limit) {
      cursor
      items {
        id
        name
        state
        created_at
        updated_at
        url
        group {
          id
          title
          color
        }
        column_values {
          id
          title
          text
          type
          value
        }
        creator {
          id
          name
          email
          photo_thumb_small
        }
        board {
          id
          name
        }
      }
    }
  }
`;

const ITEMS_PAGE_SIZE = 100;

export async function* getBoardItems(
  client: MondayClient,
  boardId: string
): AsyncGenerator<MondayItem> {
  const firstPage = await client.query<{
    boards: Array<{
      items_page: {
        cursor: string | null;
        items: MondayItem[];
      };
    }>;
  }>(ITEMS_PAGE_QUERY, { boardId: [boardId], limit: ITEMS_PAGE_SIZE });

  const board = firstPage.boards[0];
  if (!board) {
    return;
  }

  for (const item of board.items_page.items) {
    yield item;
  }

  let cursor = board.items_page.cursor;

  while (cursor) {
    const nextPage = await client.query<{
      next_items_page: {
        cursor: string | null;
        items: MondayItem[];
      };
    }>(NEXT_ITEMS_PAGE_QUERY, { cursor, limit: ITEMS_PAGE_SIZE });

    for (const item of nextPage.next_items_page.items) {
      yield item;
    }

    cursor = nextPage.next_items_page.cursor;
  }
}
