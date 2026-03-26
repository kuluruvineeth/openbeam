import { logger } from "../../lib/logger";
import type { ShowpadClient, ShowpadTag } from "../client";

const DEFAULT_PAGE_SIZE = 100;

type TagPage = {
  tags: ShowpadTag[];
  offset: number;
  hasMore: boolean;
};

export async function* listAllTags(
  client: ShowpadClient
): AsyncGenerator<TagPage, void, undefined> {
  let offset = 0;

  while (true) {
    const result = await client.listTags(offset, DEFAULT_PAGE_SIZE);

    logger.debug(
      { connectorId: client.connectorId, offset, count: result.items.length },
      "Fetched Showpad tags page"
    );

    const hasMore = offset + result.items.length < result.count;

    yield { tags: result.items, offset, hasMore };

    if (!hasMore) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
  }
}
