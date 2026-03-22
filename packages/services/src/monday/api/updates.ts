import type { MondayUpdate } from "@openbeam/types/services/connectors/monday";
import type { MondayClient } from "../client";

const ITEM_UPDATES_QUERY = `
  query GetItemUpdates($itemId: [ID!]!, $limit: Int!, $page: Int!) {
    items(ids: $itemId) {
      updates(limit: $limit, page: $page) {
        id
        body
        text_body
        created_at
        updated_at
        creator {
          id
          name
          email
          photo_thumb_small
        }
      }
    }
  }
`;

const UPDATES_PAGE_SIZE = 50;

export async function* getItemUpdates(
  client: MondayClient,
  itemId: string
): AsyncGenerator<MondayUpdate> {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await client.query<{
      items: Array<{ updates: MondayUpdate[] }>;
    }>(ITEM_UPDATES_QUERY, {
      itemId: [itemId],
      limit: UPDATES_PAGE_SIZE,
      page,
    });

    const item = data.items[0];
    if (!item) {
      break;
    }

    const updates = item.updates;
    if (updates.length === 0) {
      break;
    }

    for (const update of updates) {
      yield update;
    }

    hasMore = updates.length === UPDATES_PAGE_SIZE;
    page += 1;
  }
}
