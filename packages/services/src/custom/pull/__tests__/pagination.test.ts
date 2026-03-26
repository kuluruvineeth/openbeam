import { describe, expect, it } from "bun:test";
import {
  paginateCursor,
  paginateLinkHeader,
  paginateNone,
  paginateOffset,
  paginatePageNumber,
} from "../pagination";

function createMockFetcher(
  pages: Array<{
    body: Record<string, unknown>;
    headers?: Record<string, string>;
  }>
) {
  let callIndex = 0;
  return (_overrides: Record<string, string>) => {
    const page = pages[callIndex] ?? pages.at(-1);
    callIndex += 1;
    const resolved = page as NonNullable<typeof page>;
    return Promise.resolve({
      body: resolved.body,
      headers: new Headers(resolved.headers ?? {}),
    });
  };
}

async function collectPages(
  gen: AsyncGenerator<{ body: Record<string, unknown> }>
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  for await (const page of gen) {
    results.push(page.body);
  }
  return results;
}

describe("paginateCursor", () => {
  it("fetches multiple pages following cursor", async () => {
    const fetcher = createMockFetcher([
      { body: { data: [1, 2], next_cursor: "page2" } },
      { body: { data: [3, 4], next_cursor: "page3" } },
      { body: { data: [5], next_cursor: "" } },
    ]);

    const config = {
      strategy: "cursor" as const,
      cursorParam: "cursor",
      cursorPath: "next_cursor",
    };

    const pages = await collectPages(paginateCursor(config, fetcher));
    expect(pages).toHaveLength(3);
    expect((pages[0] as Record<string, unknown>).data).toEqual([1, 2]);
    expect((pages[2] as Record<string, unknown>).data).toEqual([5]);
  });

  it("stops on missing cursor", async () => {
    const fetcher = createMockFetcher([
      { body: { data: [1], next_cursor: null } },
    ]);

    const config = {
      strategy: "cursor" as const,
      cursorParam: "after",
      cursorPath: "next_cursor",
    };

    const pages = await collectPages(paginateCursor(config, fetcher));
    expect(pages).toHaveLength(1);
  });
});

describe("paginateOffset", () => {
  it("fetches pages using offset until total reached", async () => {
    const fetcher = createMockFetcher([
      { body: { items: [1, 2], total: 5 } },
      { body: { items: [3, 4], total: 5 } },
      { body: { items: [5], total: 5 } },
    ]);

    const config = {
      strategy: "offset" as const,
      offsetParam: "offset",
      limitParam: "limit",
      limitValue: 2,
      totalPath: "total",
    };

    const pages = await collectPages(paginateOffset(config, fetcher));
    expect(pages).toHaveLength(3);
  });

  it("stops after one page when no total path", async () => {
    const fetcher = createMockFetcher([{ body: { items: [1, 2, 3] } }]);

    const config = {
      strategy: "offset" as const,
      offsetParam: "offset",
      limitParam: "limit",
      limitValue: 10,
    };

    const pages = await collectPages(paginateOffset(config, fetcher));
    expect(pages).toHaveLength(1);
  });
});

describe("paginatePageNumber", () => {
  it("fetches pages by number until total pages reached", async () => {
    const fetcher = createMockFetcher([
      { body: { results: [1, 2], total_pages: 3 } },
      { body: { results: [3, 4], total_pages: 3 } },
      { body: { results: [5], total_pages: 3 } },
    ]);

    const config = {
      strategy: "page_number" as const,
      pageParam: "page",
      totalPagesPath: "total_pages",
      startPage: 1,
    };

    const pages = await collectPages(paginatePageNumber(config, fetcher));
    expect(pages).toHaveLength(3);
  });

  it("calculates total pages from total items", async () => {
    const fetcher = createMockFetcher([
      { body: { results: [1, 2], total_items: 5 } },
      { body: { results: [3, 4], total_items: 5 } },
      { body: { results: [5], total_items: 5 } },
    ]);

    const config = {
      strategy: "page_number" as const,
      pageParam: "page",
      perPageParam: "per_page",
      perPageValue: 2,
      totalItemsPath: "total_items",
      startPage: 1,
    };

    const pages = await collectPages(paginatePageNumber(config, fetcher));
    expect(pages).toHaveLength(3);
  });
});

describe("paginateLinkHeader", () => {
  it("follows link header rel=next", async () => {
    let callCount = 0;
    const fetcher = (_overrides: Record<string, string>) => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve({
          body: { data: [1, 2] } as Record<string, unknown>,
          headers: new Headers({
            Link: '<https://api.example.com/items?page=2>; rel="next"',
          }),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          body: { data: [3, 4] } as Record<string, unknown>,
          headers: new Headers({
            Link: '<https://api.example.com/items?page=3>; rel="next"',
          }),
        });
      }
      return Promise.resolve({
        body: { data: [5] } as Record<string, unknown>,
        headers: new Headers({}),
      });
    };

    const config = {
      strategy: "link_header" as const,
    };

    const pages = await collectPages(paginateLinkHeader(config, fetcher));
    expect(pages).toHaveLength(3);
  });

  it("stops when no link header present", async () => {
    const fetcher = createMockFetcher([{ body: { data: [1, 2, 3] } }]);

    const config = { strategy: "link_header" as const };

    const pages = await collectPages(paginateLinkHeader(config, fetcher));
    expect(pages).toHaveLength(1);
  });
});

describe("paginateNone", () => {
  it("fetches exactly one page", async () => {
    const fetcher = createMockFetcher([{ body: { items: [1, 2, 3, 4, 5] } }]);

    const config = { strategy: "none" as const };

    const pages = await collectPages(paginateNone(config, fetcher));
    expect(pages).toHaveLength(1);
    expect((pages[0] as Record<string, unknown>).items).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});
