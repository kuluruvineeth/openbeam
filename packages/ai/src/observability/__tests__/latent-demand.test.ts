import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("prom-client", () => ({
  Counter: class MockCounter {
    inc(_labels?: Record<string, string>) {
      return;
    }
    labels(_l: Record<string, string>) {
      return this;
    }
  },
  Histogram: class MockHistogram {
    observe(_labels: Record<string, string>, _value: number) {
      return;
    }
  },
}));

mock.module("../metrics", () => ({
  aiMetricsRegistry: {
    registerMetric: mock(() => {
      return;
    }),
  },
}));

import {
  createLatentDemandEvent,
  getLatentDemandLogger,
  LatentDemandEventSchema,
  LatentDemandLogger,
  LatentDemandReasonSchema,
  logLatentDemand,
} from "../latent-demand";

describe("LatentDemandReasonSchema", () => {
  const validReasons = [
    "no_tool",
    "insufficient_context",
    "low_confidence",
    "rate_limited",
    "authorization_denied",
    "capability_limit",
    "timeout",
    "unknown",
  ];

  it.each(validReasons)("validates %s reason", (reason) => {
    expect(LatentDemandReasonSchema.parse(reason)).toBe(reason);
  });

  it("throws on invalid reason", () => {
    expect(() => LatentDemandReasonSchema.parse("invalid_reason")).toThrow();
  });
});

describe("LatentDemandEventSchema", () => {
  const validEvent = {
    teamId: "team_123",
    userId: "user_456",
    query: "Find all contracts from Q4",
    failureReason: "no_tool" as const,
    timestamp: Date.now(),
    attemptedTools: [],
  };

  it("validates complete event", () => {
    const result = LatentDemandEventSchema.parse(validEvent);

    expect(result.teamId).toBe("team_123");
    expect(result.userId).toBe("user_456");
    expect(result.query).toBe("Find all contracts from Q4");
    expect(result.failureReason).toBe("no_tool");
  });

  it("validates event with optional fields", () => {
    const event = {
      ...validEvent,
      sessionId: "session_789",
      queryCategory: "search",
      suggestedCapability: "contract_analysis",
      attemptedTools: ["search_hybrid", "doc_get"],
      partialProgress: 0.5,
      metadata: { source: "web" },
    };

    const result = LatentDemandEventSchema.parse(event);

    expect(result.sessionId).toBe("session_789");
    expect(result.queryCategory).toBe("search");
    expect(result.suggestedCapability).toBe("contract_analysis");
    expect(result.attemptedTools).toEqual(["search_hybrid", "doc_get"]);
    expect(result.partialProgress).toBe(0.5);
    expect(result.metadata).toEqual({ source: "web" });
  });

  it("defaults attemptedTools to empty array", () => {
    const event = {
      teamId: "team_123",
      userId: "user_456",
      query: "test query",
      failureReason: "unknown" as const,
      timestamp: Date.now(),
    };

    const result = LatentDemandEventSchema.parse(event);
    expect(result.attemptedTools).toEqual([]);
  });

  it("throws on missing required fields", () => {
    expect(() =>
      LatentDemandEventSchema.parse({
        teamId: "team_123",
      })
    ).toThrow();
  });

  it("validates partialProgress range", () => {
    expect(() =>
      LatentDemandEventSchema.parse({
        ...validEvent,
        partialProgress: 1.5,
      })
    ).toThrow();

    expect(() =>
      LatentDemandEventSchema.parse({
        ...validEvent,
        partialProgress: -0.1,
      })
    ).toThrow();
  });
});

describe("LatentDemandLogger", () => {
  let logger: LatentDemandLogger;

  beforeEach(() => {
    logger = new LatentDemandLogger(100);
  });

  describe("log", () => {
    it("stores valid events", () => {
      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "test query",
        failureReason: "no_tool",
        timestamp: Date.now(),
        attemptedTools: [],
      });

      const events = logger.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0]?.query).toBe("test query");
    });

    it("throws on invalid event", () => {
      expect(() =>
        logger.log({
          teamId: "team_1",
        })
      ).toThrow();
    });

    it("respects maxEventHistory limit", () => {
      const maxHistory = 5;
      const smallLogger = new LatentDemandLogger(maxHistory);

      for (let i = 0; i < 10; i++) {
        smallLogger.log({
          teamId: "team_1",
          userId: "user_1",
          query: `query ${i}`,
          failureReason: "unknown",
          timestamp: Date.now() + i,
          attemptedTools: [],
        });
      }

      const events = smallLogger.getRecentEvents(100);
      expect(events).toHaveLength(maxHistory);
      expect(events[0]?.query).toBe("query 9");
    });

    it("triggers callbacks", () => {
      const callback = mock(() => {
        return;
      });
      logger.onEvent(callback);

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "test",
        failureReason: "timeout",
        timestamp: Date.now(),
        attemptedTools: [],
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("onEvent", () => {
    it("returns unsubscribe function", () => {
      const callback = mock(() => {
        return;
      });
      const unsubscribe = logger.onEvent(callback);

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "test 1",
        failureReason: "unknown",
        timestamp: Date.now(),
        attemptedTools: [],
      });

      unsubscribe();

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "test 2",
        failureReason: "unknown",
        timestamp: Date.now(),
        attemptedTools: [],
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSummary", () => {
    beforeEach(() => {
      const now = Date.now();

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "find contracts",
        failureReason: "no_tool",
        suggestedCapability: "contract_search",
        timestamp: now,
        attemptedTools: [],
      });

      logger.log({
        teamId: "team_1",
        userId: "user_2",
        query: "find contracts",
        failureReason: "no_tool",
        suggestedCapability: "contract_search",
        timestamp: now + 1,
        attemptedTools: [],
      });

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "analyze data",
        failureReason: "insufficient_context",
        suggestedCapability: "data_analysis",
        timestamp: now + 2,
        attemptedTools: [],
      });

      logger.log({
        teamId: "team_2",
        userId: "user_3",
        query: "export report",
        failureReason: "rate_limited",
        timestamp: now + 3,
        attemptedTools: [],
      });
    });

    it("returns total unfulfilled count", () => {
      const summary = logger.getSummary();
      expect(summary.totalUnfulfilled).toBe(4);
    });

    it("groups by reason", () => {
      const summary = logger.getSummary();

      expect(summary.byReason.no_tool).toBe(2);
      expect(summary.byReason.insufficient_context).toBe(1);
      expect(summary.byReason.rate_limited).toBe(1);
      expect(summary.byReason.timeout).toBe(0);
    });

    it("ranks suggested capabilities", () => {
      const summary = logger.getSummary();

      expect(summary.topSuggestedCapabilities[0]?.capability).toBe(
        "contract_search"
      );
      expect(summary.topSuggestedCapabilities[0]?.count).toBe(2);
    });

    it("identifies query patterns", () => {
      const summary = logger.getSummary();

      const contractPattern = summary.topFailedQueries.find((q) =>
        q.queryPattern.includes("find")
      );
      expect(contractPattern).toBeDefined();
      expect(contractPattern?.count).toBe(2);
    });

    it("filters by teamId", () => {
      const summary = logger.getSummary({ teamId: "team_1" });
      expect(summary.totalUnfulfilled).toBe(3);
    });

    it("filters by timestamp", () => {
      const now = Date.now();
      const summary = logger.getSummary({ since: now - 1000 });
      expect(summary.totalUnfulfilled).toBe(4);
    });

    it("respects limit", () => {
      const summary = logger.getSummary({ limit: 1 });
      expect(summary.topSuggestedCapabilities).toHaveLength(1);
      expect(summary.topFailedQueries.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getRecentEvents", () => {
    it("returns events in reverse chronological order", () => {
      const now = Date.now();

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "first",
        failureReason: "unknown",
        timestamp: now,
        attemptedTools: [],
      });

      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "second",
        failureReason: "unknown",
        timestamp: now + 1000,
        attemptedTools: [],
      });

      const events = logger.getRecentEvents(10);

      expect(events[0]?.query).toBe("second");
      expect(events[1]?.query).toBe("first");
    });

    it("respects limit", () => {
      for (let i = 0; i < 10; i++) {
        logger.log({
          teamId: "team_1",
          userId: "user_1",
          query: `query ${i}`,
          failureReason: "unknown",
          timestamp: Date.now() + i,
          attemptedTools: [],
        });
      }

      const events = logger.getRecentEvents(3);
      expect(events).toHaveLength(3);
    });
  });

  describe("clear", () => {
    it("removes all events", () => {
      logger.log({
        teamId: "team_1",
        userId: "user_1",
        query: "test",
        failureReason: "unknown",
        timestamp: Date.now(),
        attemptedTools: [],
      });

      logger.clear();

      const events = logger.getRecentEvents(10);
      expect(events).toHaveLength(0);
    });
  });
});

describe("createLatentDemandEvent", () => {
  it("creates event with required fields", () => {
    const event = createLatentDemandEvent({
      teamId: "team_1",
      userId: "user_1",
      query: "test query",
      reason: "no_tool",
    });

    expect(event.teamId).toBe("team_1");
    expect(event.userId).toBe("user_1");
    expect(event.query).toBe("test query");
    expect(event.failureReason).toBe("no_tool");
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.attemptedTools).toEqual([]);
  });

  it("includes optional fields", () => {
    const event = createLatentDemandEvent({
      teamId: "team_1",
      userId: "user_1",
      query: "test",
      reason: "low_confidence",
      sessionId: "session_1",
      queryCategory: "analysis",
      suggestedCapability: "advanced_analysis",
      attemptedTools: ["tool_1", "tool_2"],
      partialProgress: 0.75,
      metadata: { key: "value" },
    });

    expect(event.sessionId).toBe("session_1");
    expect(event.queryCategory).toBe("analysis");
    expect(event.suggestedCapability).toBe("advanced_analysis");
    expect(event.attemptedTools).toEqual(["tool_1", "tool_2"]);
    expect(event.partialProgress).toBe(0.75);
    expect(event.metadata).toEqual({ key: "value" });
  });
});

describe("global logger", () => {
  it("getLatentDemandLogger returns singleton", () => {
    const l1 = getLatentDemandLogger();
    const l2 = getLatentDemandLogger();

    expect(l1).toBe(l2);
  });
});

describe("logLatentDemand", () => {
  it("logs to global logger", () => {
    const event = createLatentDemandEvent({
      teamId: "team_global",
      userId: "user_global",
      query: "global test",
      reason: "timeout",
    });

    logLatentDemand(event);

    const logger = getLatentDemandLogger();
    const events = logger.getRecentEvents(10);

    const found = events.find((e) => e.query === "global test");
    expect(found).toBeDefined();
  });
});
