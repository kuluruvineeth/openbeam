import { describe, expect, it } from "bun:test";
import type {
  EdgeSearchQuery,
  EdgeSearchResponse,
} from "@openbeam/types/edge/search";
import { MockEmbeddingModel } from "../../mocks/mock-embedding";
import { MockSLM } from "../../mocks/mock-slm";
import { EdgeRAGPipeline } from "../pipeline";

class MockSearchEngine {
  private readonly results: EdgeSearchResponse;

  constructor(results?: Partial<EdgeSearchResponse>) {
    this.results = {
      results: results?.results ?? [],
      totalHits: results?.totalHits ?? 0,
      queryTimeMs: results?.queryTimeMs ?? 1,
      searchMode: results?.searchMode ?? "hybrid",
    };
  }

  search(
    _query: EdgeSearchQuery,
    _embedding?: Float32Array
  ): Promise<EdgeSearchResponse> {
    return Promise.resolve(this.results);
  }

  indexDocument(): Promise<void> {
    return Promise.resolve();
  }

  removeDocument(): Promise<void> {
    return Promise.resolve();
  }

  stats(): Promise<{
    ftsDocuments: number;
    vectorDocuments: number;
    storeDocuments: number;
  }> {
    return Promise.resolve({
      ftsDocuments: 0,
      vectorDocuments: 0,
      storeDocuments: 0,
    });
  }
}

describe("EdgeRAGPipeline", () => {
  function createPipeline(
    searchResults?: Partial<EdgeSearchResponse>,
    slmResponse?: string
  ) {
    const slm = new MockSLM({ latencyMs: 0 });
    if (slmResponse) {
      slm.setResponse("Answer:", slmResponse);
    }
    const embedding = new MockEmbeddingModel({ dimensions: 64 });
    const searchEngine = new MockSearchEngine(searchResults);
    const pipeline = new EdgeRAGPipeline({
      slm,
      embedding,
      searchEngine: searchEngine as any,
    });
    return { pipeline, slm, embedding, searchEngine };
  }

  it("returns answer from SLM", async () => {
    const { pipeline } = createPipeline(
      {
        results: [
          {
            documentId: "doc-1",
            title: "Test Doc",
            snippet: "Some content about testing",
            score: 0.9,
            connectorId: "conn-1",
          },
        ],
        totalHits: 1,
      },
      "Based on the documents, testing is important."
    );

    const result = await pipeline.query("What is testing?");
    expect(result.answer).toBe("Based on the documents, testing is important.");
  });

  it("includes sources from search results", async () => {
    const { pipeline } = createPipeline({
      results: [
        {
          documentId: "doc-1",
          title: "Alpha",
          snippet: "Alpha content",
          score: 0.95,
          connectorId: "conn-1",
        },
        {
          documentId: "doc-2",
          title: "Beta",
          snippet: "Beta content",
          score: 0.85,
          connectorId: "conn-1",
        },
      ],
      totalHits: 2,
    });

    const result = await pipeline.query("test query");
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].documentId).toBe("doc-1");
    expect(result.sources[0].title).toBe("Alpha");
    expect(result.sources[0].score).toBe(0.95);
    expect(result.sources[1].documentId).toBe("doc-2");
  });

  it("handles empty search results", async () => {
    const { pipeline } = createPipeline({
      results: [],
      totalHits: 0,
    });

    const result = await pipeline.query("obscure query");
    expect(result.sources).toHaveLength(0);
    expect(result.answer).toBeDefined();
  });

  it("tracks latency measurements", async () => {
    const { pipeline } = createPipeline({
      results: [
        {
          documentId: "d1",
          title: "T",
          snippet: "S",
          score: 0.5,
          connectorId: "c1",
        },
      ],
      totalHits: 1,
    });

    const result = await pipeline.query("test");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.searchLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.generationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(result.searchLatencyMs);
  });

  it("reports tokens used", async () => {
    const { pipeline } = createPipeline();
    const result = await pipeline.query("test");
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it("uses maxContextDocuments to limit search", async () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      documentId: `doc-${i}`,
      title: `Doc ${i}`,
      snippet: `Content ${i}`,
      score: 1 - i * 0.1,
      connectorId: "c1",
    }));

    const slm = new MockSLM({ latencyMs: 0 });
    const embedding = new MockEmbeddingModel({ dimensions: 64 });

    let capturedLimit = 0;
    const searchEngine = {
      search(query: EdgeSearchQuery): Promise<EdgeSearchResponse> {
        capturedLimit = query.limit ?? 10;
        return Promise.resolve({
          results: results.slice(0, capturedLimit),
          totalHits: capturedLimit,
          queryTimeMs: 1,
          searchMode: "hybrid" as const,
        });
      },
      indexDocument: () => Promise.resolve(),
      removeDocument: () => Promise.resolve(),
      stats: () =>
        Promise.resolve({
          ftsDocuments: 0,
          vectorDocuments: 0,
          storeDocuments: 0,
        }),
    };

    const pipeline = new EdgeRAGPipeline({
      slm,
      embedding,
      searchEngine: searchEngine as any,
      maxContextDocuments: 3,
    });

    const result = await pipeline.query("test");
    expect(capturedLimit).toBe(3);
    expect(result.sources).toHaveLength(3);
  });

  it("assembles context from multiple documents", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    let capturedPrompt = "";
    const origGenerate = slm.generate.bind(slm);
    slm.generate = (prompt, options) => {
      capturedPrompt = prompt;
      return origGenerate(prompt, options);
    };

    const embedding = new MockEmbeddingModel({ dimensions: 64 });
    const searchEngine = new MockSearchEngine({
      results: [
        {
          documentId: "d1",
          title: "First Doc",
          snippet: "Content of first",
          score: 0.9,
          connectorId: "c1",
        },
        {
          documentId: "d2",
          title: "Second Doc",
          snippet: "Content of second",
          score: 0.8,
          connectorId: "c1",
        },
      ],
      totalHits: 2,
    });

    const pipeline = new EdgeRAGPipeline({
      slm,
      embedding,
      searchEngine: searchEngine as any,
    });

    await pipeline.query("what are the docs about?");
    expect(capturedPrompt).toContain("[1] First Doc");
    expect(capturedPrompt).toContain("Content of first");
    expect(capturedPrompt).toContain("[2] Second Doc");
    expect(capturedPrompt).toContain("Content of second");
  });
});
