import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { EpisodicEntry, SemanticEntry } from "@openplane/types/ai";
import {
  createEmptyMemoryAccess,
  createMemoryAccess,
  type HistoryItem,
  MemoryAccessImpl,
} from "../access";
import type { MemoryConsolidator } from "../consolidator";

function createMockConsolidator(
  overrides?: Partial<MemoryConsolidator>
): MemoryConsolidator {
  return {
    retrieve: mock(() =>
      Promise.resolve({
        episodic: [],
        semantic: [],
        procedural: [],
        scores: { episodic: [], semantic: [], procedural: [] },
      })
    ),
    suggestAction: mock(() => Promise.resolve(null)),
    storeConversationTurn: mock(() =>
      Promise.resolve({ inputId: "in_1", outputId: "out_1" })
    ),
    learnFact: mock(() => Promise.resolve("fact_1")),
    ...overrides,
  } as unknown as MemoryConsolidator;
}

function createMockPreloaded() {
  return {
    preferences: {
      preferredSources: ["notion", "slack"],
      excludedSources: ["jira"],
      responseStyle: "concise" as const,
    },
    recentHistory: [
      {
        type: "search" as const,
        query: "product roadmap",
        timestamp: new Date("2024-01-15"),
        connectorType: "notion",
        success: true,
      },
      {
        type: "view" as const,
        documentId: "doc_123",
        documentTitle: "Q4 Planning",
        timestamp: new Date("2024-01-14"),
        connectorType: "confluence",
      },
      {
        type: "search" as const,
        query: "engineering OKRs",
        timestamp: new Date("2024-01-13"),
        connectorType: "notion",
        success: true,
      },
    ] as HistoryItem[],
    corrections: [
      {
        id: "corr_1",
        original: "CEO",
        corrected: "John Smith",
        context: "company leadership",
        topic: "people",
        confidence: 0.95,
        timestamp: new Date("2024-01-10"),
      },
    ],
    facts: [
      {
        id: "fact_1",
        topic: "company",
        fact: "Company was founded in 2020",
        confidence: 0.9,
        sources: ["about-page"],
        timestamp: new Date("2024-01-01"),
      },
      {
        id: "fact_2",
        topic: "product",
        fact: "Product launch is Q2 2026",
        confidence: 0.85,
        sources: ["roadmap-doc"],
        validUntil: new Date("2026-07-01"),
        timestamp: new Date("2024-01-05"),
      },
    ],
    sourceFrequencies: [
      {
        connectorType: "notion",
        frequency: 45,
        successRate: 0.92,
        lastAccessed: new Date("2024-01-15"),
      },
      {
        connectorType: "slack",
        frequency: 30,
        successRate: 0.88,
        lastAccessed: new Date("2024-01-14"),
      },
    ],
  };
}

describe("MemoryAccessImpl", () => {
  let memoryAccess: MemoryAccessImpl;
  let mockConsolidator: MemoryConsolidator;

  beforeEach(() => {
    mockConsolidator = createMockConsolidator();
    const preloaded = createMockPreloaded();
    memoryAccess = new MemoryAccessImpl(
      mockConsolidator,
      "team_123",
      "user_456",
      preloaded
    );
  });

  describe("preferences", () => {
    it("exposes preloaded preferences", () => {
      expect(memoryAccess.preferences.preferredSources).toEqual([
        "notion",
        "slack",
      ]);
      expect(memoryAccess.preferences.excludedSources).toEqual(["jira"]);
      expect(memoryAccess.preferences.responseStyle).toBe("concise");
    });
  });

  describe("getRelevantHistory", () => {
    it("returns history matching query", () => {
      const history = memoryAccess.getRelevantHistory("roadmap");

      expect(history.length).toBeGreaterThan(0);
      expect(history[0]?.query).toContain("roadmap");
    });

    it("returns history matching document title", () => {
      const history = memoryAccess.getRelevantHistory("Q4 Planning");

      expect(history.some((h) => h.documentTitle === "Q4 Planning")).toBe(true);
    });

    it("falls back to recent history when no match", () => {
      const history = memoryAccess.getRelevantHistory(
        "completely-unrelated-xyz"
      );

      expect(history.length).toBeGreaterThan(0);
    });

    it("respects limit option", () => {
      const history = memoryAccess.getRelevantHistory("roadmap", { limit: 1 });

      expect(history.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getCorrections", () => {
    it("returns corrections matching topic", () => {
      const corrections = memoryAccess.getCorrections("people");

      expect(corrections.length).toBe(1);
      expect(corrections[0]?.original).toBe("CEO");
      expect(corrections[0]?.corrected).toBe("John Smith");
    });

    it("returns corrections matching context", () => {
      const corrections = memoryAccess.getCorrections("leadership");

      expect(corrections.length).toBe(1);
    });

    it("returns corrections matching original text", () => {
      const corrections = memoryAccess.getCorrections("CEO");

      expect(corrections.length).toBe(1);
    });

    it("returns empty array for unmatched topic", () => {
      const corrections = memoryAccess.getCorrections("unknown-topic-xyz");

      expect(corrections).toEqual([]);
    });
  });

  describe("getLearnedFacts", () => {
    it("returns facts matching topic", () => {
      const facts = memoryAccess.getLearnedFacts("company");

      expect(facts.length).toBe(1);
      expect(facts[0]?.fact).toContain("founded in 2020");
    });

    it("returns facts matching fact content", () => {
      const facts = memoryAccess.getLearnedFacts("launch");

      expect(facts.length).toBe(1);
      expect(facts[0]?.fact).toContain("Q2 2026");
    });

    it("filters out expired facts", () => {
      const preloaded = createMockPreloaded();
      const productFact = preloaded.facts[1];
      if (productFact) {
        productFact.validUntil = new Date("2020-01-01");
      }

      const access = new MemoryAccessImpl(
        mockConsolidator,
        "team_123",
        "user_456",
        preloaded
      );

      const facts = access.getLearnedFacts("product");
      expect(facts.length).toBe(0);
    });
  });

  describe("getFrequentSources", () => {
    it("returns sources sorted by frequency", () => {
      const sources = memoryAccess.getFrequentSources();

      expect(sources.length).toBe(2);
      expect(sources[0]?.connectorType).toBe("notion");
      expect(sources[0]?.frequency).toBe(45);
    });

    it("respects limit option", () => {
      const sources = memoryAccess.getFrequentSources({ limit: 1 });

      expect(sources.length).toBe(1);
    });
  });

  describe("signal operations", () => {
    it("collects signals", () => {
      memoryAccess.signal({
        type: "search_executed",
        data: { query: "test" },
        importance: "medium",
      });

      const signals = memoryAccess.getCollectedSignals();
      expect(signals.length).toBe(1);
      expect(signals[0]?.type).toBe("search_executed");
    });

    it("signalSearch creates search signal", () => {
      memoryAccess.signalSearch("test query", 10, 150);

      const signals = memoryAccess.getCollectedSignals();
      expect(signals.length).toBe(1);
      expect(signals[0]?.type).toBe("search_executed");
      expect(signals[0]?.data).toEqual({
        query: "test query",
        resultCount: 10,
        latencyMs: 150,
      });
    });

    it("signalDocumentView creates document_viewed signal", () => {
      memoryAccess.signalDocumentView("doc_123", "My Document");

      const signals = memoryAccess.getCollectedSignals();
      expect(signals[0]?.type).toBe("document_viewed");
      expect(signals[0]?.data).toEqual({
        documentId: "doc_123",
        documentTitle: "My Document",
      });
    });

    it("signalResultClick creates result_clicked signal with high importance", () => {
      memoryAccess.signalResultClick("doc_123", 2, "search query");

      const signals = memoryAccess.getCollectedSignals();
      expect(signals[0]?.type).toBe("result_clicked");
      expect(signals[0]?.importance).toBe("high");
    });

    it("signalCorrection creates correction_made signal with critical importance", () => {
      memoryAccess.signalCorrection("wrong", "right", "context");

      const signals = memoryAccess.getCollectedSignals();
      expect(signals[0]?.type).toBe("correction_made");
      expect(signals[0]?.importance).toBe("critical");
    });

    it("signalPreference creates preference_expressed signal", () => {
      memoryAccess.signalPreference("theme", "dark");

      const signals = memoryAccess.getCollectedSignals();
      expect(signals[0]?.type).toBe("preference_expressed");
      expect(signals[0]?.data).toEqual({ key: "theme", value: "dark" });
    });

    it("signalFeedback creates positive feedback signal", () => {
      memoryAccess.signalFeedback(true, "helpful answer");

      const signals = memoryAccess.getCollectedSignals();
      expect(signals[0]?.type).toBe("feedback_positive");
    });

    it("signalFeedback creates negative feedback signal", () => {
      memoryAccess.signalFeedback(false, "not helpful");

      const signals = memoryAccess.getCollectedSignals();
      expect(signals[0]?.type).toBe("feedback_negative");
    });

    it("clearSignals removes all signals", () => {
      memoryAccess.signalSearch("test", 5, 100);
      memoryAccess.signalDocumentView("doc", "title");

      expect(memoryAccess.getCollectedSignals().length).toBe(2);

      memoryAccess.clearSignals();

      expect(memoryAccess.getCollectedSignals().length).toBe(0);
    });
  });

  describe("processSignals", () => {
    it("stores search signals as conversation turns", async () => {
      memoryAccess.signalSearch("test query", 10, 150);

      const result = await memoryAccess.processSignals();

      expect(result.processed).toBe(1);
      expect(result.stored).toBe(1);
      expect(mockConsolidator.storeConversationTurn).toHaveBeenCalled();
    });

    it("stores corrections as learned facts", async () => {
      memoryAccess.signalCorrection("wrong answer", "right answer", "context");

      await memoryAccess.processSignals();

      expect(mockConsolidator.learnFact).toHaveBeenCalled();
    });

    it("stores preferences as learned facts", async () => {
      memoryAccess.signalPreference("theme", "dark");

      await memoryAccess.processSignals();

      expect(mockConsolidator.learnFact).toHaveBeenCalled();
    });

    it("clears signals after processing", async () => {
      memoryAccess.signalSearch("test", 5, 100);

      await memoryAccess.processSignals();

      expect(memoryAccess.getCollectedSignals().length).toBe(0);
    });

    it("continues processing even if some signals fail", async () => {
      let callCount = 0;
      const failingConsolidator = createMockConsolidator({
        storeConversationTurn: mock(() => {
          callCount += 1;
          if (callCount === 1) {
            return Promise.reject(new Error("First fails"));
          }
          return Promise.resolve({ inputId: "in_1", outputId: "out_1" });
        }),
      });

      const access = new MemoryAccessImpl(
        failingConsolidator,
        "team_123",
        "user_456",
        createMockPreloaded()
      );

      access.signalSearch("test1", 5, 100);
      access.signalSearch("test2", 10, 200);

      const result = await access.processSignals();

      expect(result.processed).toBe(2);
      expect(result.stored).toBe(1);
    });
  });
});

describe("createMemoryAccess", () => {
  it("creates memory access with preloaded data", async () => {
    const now = Date.now();
    const mockConsolidator = createMockConsolidator({
      retrieve: mock(() =>
        Promise.resolve({
          episodic: [
            {
              entry: {
                id: "ep_1",
                type: "episodic",
                eventType: "query",
                content: "test query",
                timestamp: now,
                accessCount: 1,
                lastAccessedAt: now,
                decayFactor: 1.0,
                metadata: { teamId: "team_123" },
              } as EpisodicEntry,
              relevanceScore: 0.9,
              recencyScore: 0.8,
              importanceScore: 0.7,
              combinedScore: 0.9,
            },
          ],
          semantic: [
            {
              entry: {
                id: "sem_1",
                type: "semantic",
                category: "fact",
                content: "A learned fact",
                confidence: 0.85,
                sources: ["doc_1"],
                timestamp: now,
                accessCount: 1,
                lastAccessedAt: now,
                decayFactor: 1.0,
                metadata: { teamId: "team_123" },
              } as SemanticEntry,
              relevanceScore: 0.8,
              recencyScore: 0.7,
              importanceScore: 0.6,
              combinedScore: 0.8,
            },
          ],
          procedural: [],
          scores: { episodic: [0.9], semantic: [0.8], procedural: [] },
          combined: [],
          queryTime: 0,
        })
      ),
    });

    const memory = await createMemoryAccess(
      mockConsolidator,
      "team_123",
      "user_456"
    );

    expect(memory).toBeDefined();
    expect(memory.preferences).toBeDefined();
    expect(mockConsolidator.retrieve).toHaveBeenCalledTimes(2);
  });

  it("handles empty retrieval results", async () => {
    const mockConsolidator = createMockConsolidator();

    const memory = await createMemoryAccess(
      mockConsolidator,
      "team_123",
      "user_456"
    );

    expect(memory).toBeDefined();
    expect(memory.getRelevantHistory("test")).toEqual([]);
  });

  it("respects history limit option", async () => {
    const mockConsolidator = createMockConsolidator();

    await createMemoryAccess(mockConsolidator, "team_123", "user_456", {
      historyLimit: 100,
    });

    expect(mockConsolidator.retrieve).toHaveBeenCalled();
  });

  it("respects facts limit option", async () => {
    const mockConsolidator = createMockConsolidator();

    await createMemoryAccess(mockConsolidator, "team_123", "user_456", {
      factsLimit: 50,
    });

    expect(mockConsolidator.retrieve).toHaveBeenCalled();
  });
});

describe("createEmptyMemoryAccess", () => {
  it("creates memory access with empty data", () => {
    const memory = createEmptyMemoryAccess();

    expect(memory).toBeDefined();
    expect(memory.preferences).toEqual({});
    expect(memory.getRelevantHistory("test")).toEqual([]);
    expect(memory.getCorrections("test")).toEqual([]);
    expect(memory.getLearnedFacts("test")).toEqual([]);
    expect(memory.getFrequentSources()).toEqual([]);
  });

  it("signals are no-ops but do not throw", () => {
    const memory = createEmptyMemoryAccess();

    expect(() => memory.signalSearch("test", 5, 100)).not.toThrow();
    expect(() => memory.signalDocumentView("doc", "title")).not.toThrow();
    expect(() => memory.signalFeedback(true)).not.toThrow();
  });
});
