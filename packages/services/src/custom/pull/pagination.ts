import type { PaginationConfig } from "@openbeam/types/services/connectors/custom-pull";
import { resolveJsonPath } from "./jsonpath";
import { PaginationError } from "./types";

type Fetcher = (
  queryOverrides: Record<string, string>
) => Promise<{ body: Record<string, unknown>; headers: Headers }>;

const LINK_NEXT_PATTERN = /<([^>]+)>;\s*rel="next"/;

export async function* paginateCursor(
  config: Extract<PaginationConfig, { strategy: "cursor" }>,
  fetcher: Fetcher
): AsyncGenerator<{ body: Record<string, unknown> }> {
  let cursor: string | undefined;

  while (true) {
    const overrides: Record<string, string> = {};
    if (cursor) {
      overrides[config.cursorParam] = cursor;
    }
    if (config.limitParam && config.limitValue) {
      overrides[config.limitParam] = String(config.limitValue);
    }

    const { body } = await fetcher(overrides);
    yield { body };

    const nextCursor = resolveJsonPath(body, config.cursorPath);
    if (
      !nextCursor ||
      (typeof nextCursor === "string" && nextCursor.length === 0)
    ) {
      break;
    }
    cursor = String(nextCursor);
  }
}

export async function* paginateOffset(
  config: Extract<PaginationConfig, { strategy: "offset" }>,
  fetcher: Fetcher
): AsyncGenerator<{ body: Record<string, unknown> }> {
  let offset = 0;
  const limit = config.limitValue;

  while (true) {
    const overrides: Record<string, string> = {
      [config.offsetParam]: String(offset),
      [config.limitParam]: String(limit),
    };

    const { body } = await fetcher(overrides);
    yield { body };

    let total: number | undefined;
    if (config.totalPath) {
      const rawTotal = resolveJsonPath(body, config.totalPath);
      if (typeof rawTotal === "number") {
        total = rawTotal;
      } else if (typeof rawTotal === "string") {
        const parsed = Number(rawTotal);
        if (!Number.isNaN(parsed)) {
          total = parsed;
        }
      }
    }

    offset += limit;

    if (total !== undefined && offset >= total) {
      break;
    }

    if (total === undefined) {
      break;
    }
  }
}

export async function* paginatePageNumber(
  config: Extract<PaginationConfig, { strategy: "page_number" }>,
  fetcher: Fetcher
): AsyncGenerator<{ body: Record<string, unknown> }> {
  let page = config.startPage;

  while (true) {
    const overrides: Record<string, string> = {
      [config.pageParam]: String(page),
    };
    if (config.perPageParam && config.perPageValue) {
      overrides[config.perPageParam] = String(config.perPageValue);
    }

    const { body } = await fetcher(overrides);
    yield { body };

    let totalPages: number | undefined;

    if (config.totalPagesPath) {
      const raw = resolveJsonPath(body, config.totalPagesPath);
      if (typeof raw === "number") {
        totalPages = raw;
      }
    } else if (config.totalItemsPath && config.perPageValue) {
      const raw = resolveJsonPath(body, config.totalItemsPath);
      if (typeof raw === "number") {
        totalPages = Math.ceil(raw / config.perPageValue);
      }
    }

    page += 1;

    if (totalPages !== undefined && page >= totalPages + config.startPage) {
      break;
    }

    if (totalPages === undefined) {
      break;
    }
  }
}

export async function* paginateLinkHeader(
  config: Extract<PaginationConfig, { strategy: "link_header" }>,
  fetcher: Fetcher
): AsyncGenerator<{ body: Record<string, unknown>; nextUrl?: string }> {
  let isFirst = true;
  let nextUrl: string | undefined;

  while (true) {
    const overrides: Record<string, string> = {};
    if (isFirst && config.limitParam && config.limitValue) {
      overrides[config.limitParam] = String(config.limitValue);
    }
    isFirst = false;

    const { body, headers } = nextUrl
      ? await fetchAbsoluteUrl(nextUrl, fetcher)
      : await fetcher(overrides);

    yield { body };

    const linkHeader = headers.get("link") ?? headers.get("Link");
    if (!linkHeader) {
      break;
    }

    const match = linkHeader.match(LINK_NEXT_PATTERN);
    if (!match?.[1]) {
      break;
    }
    nextUrl = match[1];
  }
}

function fetchAbsoluteUrl(
  _url: string,
  fetcher: Fetcher
): Promise<{ body: Record<string, unknown>; headers: Headers }> {
  return fetcher({ __absolute_url: _url });
}

export async function* paginateNone(
  _config: Extract<PaginationConfig, { strategy: "none" }>,
  fetcher: Fetcher
): AsyncGenerator<{ body: Record<string, unknown> }> {
  const { body } = await fetcher({});
  yield { body };
}

export function createPaginator(
  config: PaginationConfig,
  fetcher: Fetcher
): AsyncGenerator<{ body: Record<string, unknown>; nextUrl?: string }> {
  switch (config.strategy) {
    case "cursor":
      return paginateCursor(config, fetcher);
    case "offset":
      return paginateOffset(config, fetcher);
    case "page_number":
      return paginatePageNumber(config, fetcher);
    case "link_header":
      return paginateLinkHeader(config, fetcher);
    case "none":
      return paginateNone(config, fetcher);
    default:
      throw new PaginationError({
        message: `Unknown pagination strategy: ${(config as { strategy: string }).strategy}`,
        strategy: (config as { strategy: string }).strategy,
      });
  }
}
