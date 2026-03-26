import { logger } from "../../lib/logger";
import type { ShowpadChannel, ShowpadClient } from "../client";

const DEFAULT_PAGE_SIZE = 50;

type ChannelPage = {
  channels: ShowpadChannel[];
  offset: number;
  hasMore: boolean;
};

export async function* listAllChannels(
  client: ShowpadClient
): AsyncGenerator<ChannelPage, void, undefined> {
  let offset = 0;

  while (true) {
    const result = await client.listChannels(offset, DEFAULT_PAGE_SIZE);

    logger.debug(
      {
        connectorId: client.connectorId,
        offset,
        count: result.items.length,
      },
      "Fetched Showpad channels page"
    );

    const hasMore = offset + result.items.length < result.count;

    yield { channels: result.items, offset, hasMore };

    if (!hasMore) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
  }
}
