import { logger } from "../../lib/logger";
import type { BynderAsset, BynderClient } from "../client";

const DEFAULT_PAGE_SIZE = 100;

type AssetPage = {
  assets: BynderAsset[];
  page: number;
  hasMore: boolean;
};

export async function* listAllAssets(
  client: BynderClient,
  params: Record<string, string> = {}
): AsyncGenerator<AssetPage, void, undefined> {
  let page = 1;

  while (true) {
    const assets = await client.listAssets(page, DEFAULT_PAGE_SIZE, params);

    logger.debug(
      { connectorId: client.connectorId, page, count: assets.length },
      "Fetched Bynder assets page"
    );

    const hasMore = assets.length === DEFAULT_PAGE_SIZE;

    yield { assets, page, hasMore };

    if (!hasMore) {
      break;
    }

    page += 1;
  }
}
