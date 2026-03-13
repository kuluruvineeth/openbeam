import { describe, expect, it } from "bun:test";
import type {
  PaginationMetadata,
  RankingStrategy,
  SearchFilters,
  SearchHit,
} from "../search";
import { selectRankingProfile } from "../search";

describe("selectRankingProfile", () => {
  describe("with embeddings available", () => {
    it("returns bm25 for keyword strategy", () => {
      expect(selectRankingProfile("keyword", true)).toBe("bm25");
    });

    it("returns semantic_v2 for semantic strategy", () => {
      expect(selectRankingProfile("semantic", true)).toBe("semantic_v2");
    });

    it("returns hybrid_v2 for hybrid strategy", () => {
      expect(selectRankingProfile("hybrid", true)).toBe("hybrid_v2");
    });

    it("returns hybrid_recency for recency strategy", () => {
      expect(selectRankingProfile("recency", true)).toBe("hybrid_recency");
    });

    it("returns authority for authority strategy", () => {
      expect(selectRankingProfile("authority", true)).toBe("authority");
    });

    it("returns personalized for personalized strategy", () => {
      expect(selectRankingProfile("personalized", true)).toBe("personalized");
    });
  });

  describe("without embeddings available", () => {
    it("returns bm25 for keyword strategy", () => {
      expect(selectRankingProfile("keyword", false)).toBe("bm25");
    });

    it("falls back to bm25 for semantic strategy", () => {
      expect(selectRankingProfile("semantic", false)).toBe("bm25");
    });

    it("falls back to bm25 for hybrid strategy", () => {
      expect(selectRankingProfile("hybrid", false)).toBe("bm25");
    });

    it("falls back to recency for recency strategy", () => {
      expect(selectRankingProfile("recency", false)).toBe("recency");
    });

    it("returns authority for authority strategy", () => {
      expect(selectRankingProfile("authority", false)).toBe("authority");
    });

    it("falls back to hybrid_v2 for personalized strategy", () => {
      expect(selectRankingProfile("personalized", false)).toBe("hybrid_v2");
    });
  });

  describe("edge cases", () => {
    it("returns hybrid_v2 for unknown strategy", () => {
      expect(selectRankingProfile("unknown" as RankingStrategy, true)).toBe(
        "hybrid_v2"
      );
    });
  });
});

describe("PaginationMetadata", () => {
  function createPagination(
    totalResults: number,
    offset: number,
    limit: number
  ): PaginationMetadata {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalResults / limit);
    const hasNextPage = offset + limit < totalResults;
    const hasPreviousPage = offset > 0;

    return {
      offset,
      limit,
      totalResults,
      hasNextPage,
      hasPreviousPage,
      currentPage,
      totalPages,
      nextOffset: hasNextPage ? offset + limit : null,
      previousOffset: hasPreviousPage ? Math.max(0, offset - limit) : null,
    };
  }

  it("calculates first page correctly", () => {
    const pagination = createPagination(100, 0, 20);

    expect(pagination.currentPage).toBe(1);
    expect(pagination.totalPages).toBe(5);
    expect(pagination.hasNextPage).toBe(true);
    expect(pagination.hasPreviousPage).toBe(false);
    expect(pagination.nextOffset).toBe(20);
    expect(pagination.previousOffset).toBeNull();
  });

  it("calculates middle page correctly", () => {
    const pagination = createPagination(100, 40, 20);

    expect(pagination.currentPage).toBe(3);
    expect(pagination.hasNextPage).toBe(true);
    expect(pagination.hasPreviousPage).toBe(true);
    expect(pagination.nextOffset).toBe(60);
    expect(pagination.previousOffset).toBe(20);
  });

  it("calculates last page correctly", () => {
    const pagination = createPagination(100, 80, 20);

    expect(pagination.currentPage).toBe(5);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPreviousPage).toBe(true);
    expect(pagination.nextOffset).toBeNull();
    expect(pagination.previousOffset).toBe(60);
  });

  it("handles single page", () => {
    const pagination = createPagination(10, 0, 20);

    expect(pagination.currentPage).toBe(1);
    expect(pagination.totalPages).toBe(1);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPreviousPage).toBe(false);
  });

  it("handles zero results", () => {
    const pagination = createPagination(0, 0, 20);

    expect(pagination.currentPage).toBe(1);
    expect(pagination.totalPages).toBe(0);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPreviousPage).toBe(false);
  });

  it("handles exact page boundaries", () => {
    const pagination = createPagination(60, 40, 20);

    expect(pagination.currentPage).toBe(3);
    expect(pagination.totalPages).toBe(3);
    expect(pagination.hasNextPage).toBe(false);
  });

  it("handles partial last page", () => {
    const pagination = createPagination(55, 40, 20);

    expect(pagination.totalPages).toBe(3);
    expect(pagination.hasNextPage).toBe(false);
  });
});

describe("SearchFilters", () => {
  function createFilters(
    overrides: Partial<SearchFilters> = {}
  ): SearchFilters {
    return {
      connectorTypes: undefined,
      connectorIds: undefined,
      documentTypes: undefined,
      sourceIds: undefined,
      labels: undefined,
      dateRange: undefined,
      accessControlIds: undefined,
      isPublic: undefined,
      ...overrides,
    };
  }

  it("empty filters has all undefined", () => {
    const filters = createFilters();

    expect(filters.connectorTypes).toBeUndefined();
    expect(filters.connectorIds).toBeUndefined();
    expect(filters.documentTypes).toBeUndefined();
    expect(filters.dateRange).toBeUndefined();
    expect(filters.accessControlIds).toBeUndefined();
    expect(filters.isPublic).toBeUndefined();
  });

  it("accepts connector type filters", () => {
    const filters = createFilters({
      connectorTypes: ["SLACK", "NOTION"],
    });

    expect(filters.connectorTypes).toHaveLength(2);
    expect(filters.connectorTypes).toContain("SLACK");
    expect(filters.connectorTypes).toContain("NOTION");
  });

  it("accepts date range filters", () => {
    const now = Date.now();
    const dayAgo = now - 86_400_000;

    const filters = createFilters({
      dateRange: { start: dayAgo, end: now },
    });

    expect(filters.dateRange?.start).toBe(dayAgo);
    expect(filters.dateRange?.end).toBe(now);
  });

  it("accepts access control filters", () => {
    const filters = createFilters({
      accessControlIds: ["user_123", "group_456"],
    });

    expect(filters.accessControlIds).toHaveLength(2);
  });

  it("accepts isPublic filter", () => {
    const publicOnly = createFilters({ isPublic: true });
    const privateOnly = createFilters({ isPublic: false });

    expect(publicOnly.isPublic).toBe(true);
    expect(privateOnly.isPublic).toBe(false);
  });

  it("accepts label filters", () => {
    const filters = createFilters({
      labels: ["important", "review"],
    });

    expect(filters.labels).toHaveLength(2);
  });
});

describe("SearchHit", () => {
  interface MockDocument {
    id: string;
    title: string;
    content: string;
  }

  function createSearchHit(
    overrides: Partial<SearchHit<MockDocument>> = {}
  ): SearchHit<MockDocument> {
    return {
      id: "doc_123",
      relevance: 0.95,
      source: "vespa",
      document: {
        id: "doc_123",
        title: "Test Document",
        content: "Test content",
      },
      ...overrides,
    };
  }

  it("has required fields", () => {
    const hit = createSearchHit();

    expect(hit.id).toBe("doc_123");
    expect(hit.relevance).toBe(0.95);
    expect(hit.source).toBe("vespa");
    expect(hit.document).toBeDefined();
  });

  it("relevance score in valid range", () => {
    const highScore = createSearchHit({ relevance: 0.99 });
    const lowScore = createSearchHit({ relevance: 0.01 });

    expect(highScore.relevance).toBeGreaterThanOrEqual(0);
    expect(highScore.relevance).toBeLessThanOrEqual(1);
    expect(lowScore.relevance).toBeGreaterThanOrEqual(0);
    expect(lowScore.relevance).toBeLessThanOrEqual(1);
  });

  it("document contains full document data", () => {
    const hit = createSearchHit({
      document: {
        id: "custom_456",
        title: "Custom Title",
        content: "Custom content here",
      },
    });

    expect(hit.document.id).toBe("custom_456");
    expect(hit.document.title).toBe("Custom Title");
    expect(hit.document.content).toBe("Custom content here");
  });
});

describe("RankingStrategy", () => {
  it("all strategies return valid profile with embeddings", () => {
    const strategies: RankingStrategy[] = [
      "keyword",
      "semantic",
      "hybrid",
      "recency",
      "authority",
      "personalized",
    ];

    const validProfiles = [
      "bm25",
      "semantic_v2",
      "hybrid_v2",
      "hybrid_recency",
      "recency",
      "authority",
      "personalized",
    ];

    for (const strategy of strategies) {
      const profile = selectRankingProfile(strategy, true);
      expect(validProfiles).toContain(profile);
    }
  });

  it("all strategies return valid profile without embeddings", () => {
    const strategies: RankingStrategy[] = [
      "keyword",
      "semantic",
      "hybrid",
      "recency",
      "authority",
      "personalized",
    ];

    const validProfiles = [
      "bm25",
      "semantic_v2",
      "hybrid_v2",
      "hybrid_recency",
      "recency",
      "authority",
      "personalized",
    ];

    for (const strategy of strategies) {
      const profile = selectRankingProfile(strategy, false);
      expect(validProfiles).toContain(profile);
    }
  });
});

describe("aggregatedHits sorting", () => {
  it("sorts hits by descending relevance", () => {
    const hits: SearchHit<{ id: string }>[] = [
      { id: "a", relevance: 0.5, source: "vespa", document: { id: "a" } },
      { id: "b", relevance: 0.9, source: "vespa", document: { id: "b" } },
      { id: "c", relevance: 0.3, source: "vespa", document: { id: "c" } },
      { id: "d", relevance: 0.7, source: "vespa", document: { id: "d" } },
    ];

    const sorted = [...hits].sort((a, b) => b.relevance - a.relevance);

    expect(sorted[0]?.id).toBe("b");
    expect(sorted[1]?.id).toBe("d");
    expect(sorted[2]?.id).toBe("a");
    expect(sorted[3]?.id).toBe("c");
  });

  it("deduplicates by keeping highest score", () => {
    const hits: SearchHit<{ id: string }>[] = [
      { id: "a", relevance: 0.5, source: "vespa", document: { id: "a" } },
      { id: "a", relevance: 0.9, source: "vespa", document: { id: "a" } },
      { id: "b", relevance: 0.3, source: "vespa", document: { id: "b" } },
    ];

    const docScores = new Map<
      string,
      { score: number; hit: SearchHit<{ id: string }> }
    >();

    for (const hit of hits) {
      const existing = docScores.get(hit.id);
      if (!existing || hit.relevance > existing.score) {
        docScores.set(hit.id, { score: hit.relevance, hit });
      }
    }

    const deduplicated = Array.from(docScores.values())
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.hit);

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0]?.id).toBe("a");
    expect(deduplicated[0]?.relevance).toBe(0.9);
    expect(deduplicated[1]?.id).toBe("b");
  });
});
