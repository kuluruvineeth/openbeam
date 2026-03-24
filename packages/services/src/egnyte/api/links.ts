import type { EgnyteClient, EgnyteLink } from "../client";

type LinksPage = {
  links: EgnyteLink[];
  hasMore: boolean;
};

const PAGE_SIZE = 100;

export async function* listAllLinks(
  client: EgnyteClient
): AsyncGenerator<LinksPage, void, undefined> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await client.listLinks(offset, PAGE_SIZE);

    yield {
      links: response.links,
      hasMore: response.links.length === PAGE_SIZE,
    };

    hasMore = response.links.length === PAGE_SIZE;
    offset += response.links.length;
  }
}
