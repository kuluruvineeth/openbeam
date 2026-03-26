import { logger } from "../../lib/logger";
import type { ShowpadAsset, ShowpadClient } from "../client";

const DEFAULT_PAGE_SIZE = 100;

type AssetPage = {
  assets: ShowpadAsset[];
  offset: number;
  hasMore: boolean;
};

export async function* listAllAssets(
  client: ShowpadClient,
  params: Record<string, string> = {}
): AsyncGenerator<AssetPage, void, undefined> {
  let offset = 0;

  while (true) {
    const result = await client.listAssets(offset, DEFAULT_PAGE_SIZE, params);

    logger.debug(
      { connectorId: client.connectorId, offset, count: result.items.length },
      "Fetched Showpad assets page"
    );

    const hasMore = offset + result.items.length < result.count;

    yield { assets: result.items, offset, hasMore };

    if (!hasMore) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
  }
}
