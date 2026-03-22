import type { MondayBoard } from "@openbeam/types/services/connectors/monday";
import type { MondayClient } from "../client";

const BOARDS_QUERY = `
  query GetBoards($limit: Int!, $page: Int!) {
    boards(limit: $limit, page: $page, order_by: created_at) {
      id
      name
      description
      state
      board_kind
      updated_at
      workspace_id
      url
      columns {
        id
        title
        type
        settings_str
      }
      groups {
        id
        title
        color
        position
      }
      owners {
        id
        name
        email
        photo_thumb_small
      }
      creator {
        id
        name
        email
        photo_thumb_small
      }
    }
  }
`;

const PAGE_SIZE = 25;

export async function* getAllBoards(
  client: MondayClient,
  options?: { boardKinds?: string[] }
): AsyncGenerator<MondayBoard> {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await client.query<{ boards: MondayBoard[] }>(BOARDS_QUERY, {
      limit: PAGE_SIZE,
      page,
    });

    const boards = data.boards;
    if (boards.length === 0) {
      break;
    }

    for (const board of boards) {
      if (
        options?.boardKinds &&
        options.boardKinds.length > 0 &&
        !options.boardKinds.includes(board.board_kind)
      ) {
        continue;
      }
      yield board;
    }

    hasMore = boards.length === PAGE_SIZE;
    page += 1;
  }
}
