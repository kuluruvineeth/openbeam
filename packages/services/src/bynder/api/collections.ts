import { logger } from "../../lib/logger";
import type { BynderClient, BynderCollection } from "../client";

const DEFAULT_PAGE_SIZE = 50;

type CollectionPage = {
  collections: BynderCollection[];
  page: number;
  hasMore: boolean;
};

export async function* listAllCollections(
  client: BynderClient
): AsyncGenerator<CollectionPage, void, undefined> {
  let page = 1;

  while (true) {
    const collections = await client.listCollections(page, DEFAULT_PAGE_SIZE);

    logger.debug(
      {
        connectorId: client.connectorId,
        page,
        count: collections.length,
      },
      "Fetched Bynder collections page"
    );

    const hasMore = collections.length === DEFAULT_PAGE_SIZE;

    yield { collections, page, hasMore };

    if (!hasMore) {
      break;
    }

    page += 1;
  }
}
