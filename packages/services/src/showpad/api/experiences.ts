import { logger } from "../../lib/logger";
import type { ShowpadClient, ShowpadExperience } from "../client";

const DEFAULT_PAGE_SIZE = 50;

type ExperiencePage = {
  experiences: ShowpadExperience[];
  offset: number;
  hasMore: boolean;
};

export async function* listAllExperiences(
  client: ShowpadClient
): AsyncGenerator<ExperiencePage, void, undefined> {
  let offset = 0;

  while (true) {
    const result = await client.listExperiences(offset, DEFAULT_PAGE_SIZE);

    logger.debug(
      {
        connectorId: client.connectorId,
        offset,
        count: result.items.length,
      },
      "Fetched Showpad experiences page"
    );

    const hasMore = offset + result.items.length < result.count;

    yield { experiences: result.items, offset, hasMore };

    if (!hasMore) {
      break;
    }

    offset += DEFAULT_PAGE_SIZE;
  }
}
