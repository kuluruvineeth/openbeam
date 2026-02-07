import { describe, expect, it } from "bun:test";
import {
  AggregateMentionsInputSchema,
  AggregateMentionsOutputSchema,
  ComputeExpertiseInputSchema,
  ComputeExpertiseOutputSchema,
  DecayScoresInputSchema,
  DecayScoresOutputSchema,
  DetectPatternsInputSchema,
  DetectPatternsOutputSchema,
  InferRelationshipsInputSchema,
  InferRelationshipsOutputSchema,
  PersistInferenceInputSchema,
  PersistInferenceOutputSchema,
} from "../activities/knowledge";
import {
  ProcessKnowledgeChangesInputSchema,
  ProcessKnowledgeChangesOutputSchema,
} from "../workflows/knowledge-changes";
import {
  KnowledgeInferenceInputSchema,
  KnowledgeInferenceOutputSchema,
} from "../workflows/knowledge-inference";

describe("KnowledgeInferenceInputSchema", () => {
  it("accepts valid required fields", () => {
    const result = KnowledgeInferenceInputSchema.parse({
      teamId: "team_123",
      inferenceType: "daily",
    });

    expect(result.teamId).toBe("team_123");
    expect(result.inferenceType).toBe("daily");
  });

  it("applies correct defaults", () => {
    const result = KnowledgeInferenceInputSchema.parse({
      teamId: "team_1",
      inferenceType: "weekly",
    });

    expect(result.decayHalfLifeDays).toBe(30);
    expect(result.coOccurrenceThreshold).toBe(3);
    expect(result.confidenceThreshold).toBe(0.6);
    expect(result.includePatternDetection).toBe(false);
  });

  it("accepts all optional overrides", () => {
    const result = KnowledgeInferenceInputSchema.parse({
      teamId: "team_1",
      inferenceType: "daily",
      decayHalfLifeDays: 14,
      coOccurrenceThreshold: 5,
      confidenceThreshold: 0.8,
      includePatternDetection: true,
      remainingTeamIds: ["team_2", "team_3"],
      resumeOffset: 200,
      sinceTimestamp: 1_706_742_000_000,
    });

    expect(result.decayHalfLifeDays).toBe(14);
    expect(result.coOccurrenceThreshold).toBe(5);
    expect(result.confidenceThreshold).toBe(0.8);
    expect(result.includePatternDetection).toBe(true);
    expect(result.remainingTeamIds).toEqual(["team_2", "team_3"]);
    expect(result.resumeOffset).toBe(200);
    expect(result.sinceTimestamp).toBe(1_706_742_000_000);
  });

  it("rejects invalid inferenceType", () => {
    expect(() =>
      KnowledgeInferenceInputSchema.parse({
        teamId: "team_1",
        inferenceType: "monthly",
      })
    ).toThrow();
  });

  it("rejects missing teamId", () => {
    expect(() =>
      KnowledgeInferenceInputSchema.parse({ inferenceType: "daily" })
    ).toThrow();
  });

  it("rejects non-string teamId", () => {
    expect(() =>
      KnowledgeInferenceInputSchema.parse({
        teamId: 123,
        inferenceType: "daily",
      })
    ).toThrow();
  });
});

describe("KnowledgeInferenceOutputSchema", () => {
  it("accepts valid output", () => {
    const result = KnowledgeInferenceOutputSchema.parse({
      teamId: "team_1",
      entitiesProcessed: 150,
      edgesCreated: 42,
      patternsDetected: 3,
      scoresDecayed: 75,
    });

    expect(result.teamId).toBe("team_1");
    expect(result.entitiesProcessed).toBe(150);
    expect(result.edgesCreated).toBe(42);
    expect(result.patternsDetected).toBe(3);
    expect(result.scoresDecayed).toBe(75);
  });

  it("rejects missing fields", () => {
    expect(() =>
      KnowledgeInferenceOutputSchema.parse({ teamId: "team_1" })
    ).toThrow();
  });
});

describe("ProcessKnowledgeChangesInputSchema", () => {
  it("accepts valid incremental input", () => {
    const result = ProcessKnowledgeChangesInputSchema.parse({
      teamId: "team_1",
      connectorId: "conn_1",
      changeType: "incremental",
    });

    expect(result.teamId).toBe("team_1");
    expect(result.connectorId).toBe("conn_1");
    expect(result.changeType).toBe("incremental");
  });

  it("accepts full_rebuild changeType", () => {
    const result = ProcessKnowledgeChangesInputSchema.parse({
      teamId: "team_1",
      connectorId: "conn_1",
      changeType: "full_rebuild",
    });

    expect(result.changeType).toBe("full_rebuild");
  });

  it("accepts optional syncHistoryId and processedSoFar", () => {
    const result = ProcessKnowledgeChangesInputSchema.parse({
      teamId: "team_1",
      connectorId: "conn_1",
      changeType: "incremental",
      syncHistoryId: "sync_789",
      processedSoFar: 500,
    });

    expect(result.syncHistoryId).toBe("sync_789");
    expect(result.processedSoFar).toBe(500);
  });

  it("rejects invalid changeType", () => {
    expect(() =>
      ProcessKnowledgeChangesInputSchema.parse({
        teamId: "team_1",
        connectorId: "conn_1",
        changeType: "partial",
      })
    ).toThrow();
  });

  it("rejects missing connectorId", () => {
    expect(() =>
      ProcessKnowledgeChangesInputSchema.parse({
        teamId: "team_1",
        changeType: "incremental",
      })
    ).toThrow();
  });

  it("rejects missing teamId", () => {
    expect(() =>
      ProcessKnowledgeChangesInputSchema.parse({
        connectorId: "conn_1",
        changeType: "incremental",
      })
    ).toThrow();
  });
});

describe("ProcessKnowledgeChangesOutputSchema", () => {
  it("accepts valid output", () => {
    const result = ProcessKnowledgeChangesOutputSchema.parse({
      processed: 100,
      entitiesUpdated: 25,
      edgesUpdated: 10,
    });

    expect(result.processed).toBe(100);
    expect(result.entitiesUpdated).toBe(25);
    expect(result.edgesUpdated).toBe(10);
  });

  it("rejects missing fields", () => {
    expect(() =>
      ProcessKnowledgeChangesOutputSchema.parse({ processed: 50 })
    ).toThrow();
  });
});

describe("AggregateMentionsInputSchema", () => {
  it("accepts valid input", () => {
    const result = AggregateMentionsInputSchema.parse({
      teamId: "team_1",
      entityBatchOffset: 0,
      batchSize: 500,
    });

    expect(result.entityBatchOffset).toBe(0);
    expect(result.batchSize).toBe(500);
  });

  it("accepts optional sinceTimestamp", () => {
    const result = AggregateMentionsInputSchema.parse({
      teamId: "team_1",
      entityBatchOffset: 100,
      batchSize: 200,
      sinceTimestamp: 1_706_742_000_000,
    });

    expect(result.sinceTimestamp).toBe(1_706_742_000_000);
  });

  it("rejects missing batchSize", () => {
    expect(() =>
      AggregateMentionsInputSchema.parse({
        teamId: "team_1",
        entityBatchOffset: 0,
      })
    ).toThrow();
  });
});

describe("AggregateMentionsOutputSchema", () => {
  it("accepts output with summary records", () => {
    const result = AggregateMentionsOutputSchema.parse({
      entityCount: 50,
      hasMore: false,
      nextOffset: null,
      summary: {
        entity_1: {
          entityId: "e1",
          mentionCount: 10,
          sources: ["slack", "notion"],
          lastMentionedAt: 1_706_742_000_000,
        },
      },
    });

    expect(result.entityCount).toBe(50);
    expect(result.summary.entity_1?.mentionCount).toBe(10);
    expect(result.summary.entity_1?.sources).toEqual(["slack", "notion"]);
  });

  it("accepts empty summary", () => {
    const result = AggregateMentionsOutputSchema.parse({
      entityCount: 0,
      hasMore: false,
      nextOffset: null,
      summary: {},
    });

    expect(result.entityCount).toBe(0);
    expect(Object.keys(result.summary)).toHaveLength(0);
  });
});

describe("ComputeExpertiseInputSchema", () => {
  it("accepts valid input", () => {
    const result = ComputeExpertiseInputSchema.parse({
      teamId: "team_1",
      mentionSummary: { key: "value" },
      decayHalfLifeDays: 30,
    });

    expect(result.teamId).toBe("team_1");
    expect(result.decayHalfLifeDays).toBe(30);
  });

  it("rejects missing decayHalfLifeDays", () => {
    expect(() =>
      ComputeExpertiseInputSchema.parse({
        teamId: "team_1",
        mentionSummary: {},
      })
    ).toThrow();
  });
});

describe("ComputeExpertiseOutputSchema", () => {
  it("accepts output with top experts", () => {
    const result = ComputeExpertiseOutputSchema.parse({
      scoresUpdated: 10,
      topExperts: [
        { entityId: "e1", score: 8.5, domains: ["engineering", "design"] },
        { entityId: "e2", score: 5.2, domains: ["product"] },
      ],
    });

    expect(result.scoresUpdated).toBe(10);
    expect(result.topExperts).toHaveLength(2);
    expect(result.topExperts[0]?.score).toBe(8.5);
    expect(result.topExperts[0]?.domains).toEqual(["engineering", "design"]);
  });

  it("accepts empty topExperts array", () => {
    const result = ComputeExpertiseOutputSchema.parse({
      scoresUpdated: 0,
      topExperts: [],
    });

    expect(result.topExperts).toHaveLength(0);
  });
});

describe("InferRelationshipsInputSchema", () => {
  it("accepts valid input", () => {
    const result = InferRelationshipsInputSchema.parse({
      teamId: "team_1",
      coOccurrenceThreshold: 3,
      confidenceThreshold: 0.6,
    });

    expect(result.coOccurrenceThreshold).toBe(3);
    expect(result.confidenceThreshold).toBe(0.6);
  });

  it("rejects missing thresholds", () => {
    expect(() =>
      InferRelationshipsInputSchema.parse({ teamId: "team_1" })
    ).toThrow();
  });
});

describe("InferRelationshipsOutputSchema", () => {
  it("accepts valid output", () => {
    const result = InferRelationshipsOutputSchema.parse({
      edgesCreated: 5,
      edgesUpdated: 12,
      edgesRemoved: 2,
    });

    expect(result.edgesCreated).toBe(5);
    expect(result.edgesUpdated).toBe(12);
    expect(result.edgesRemoved).toBe(2);
  });
});

describe("DetectPatternsInputSchema", () => {
  it("accepts valid input", () => {
    const result = DetectPatternsInputSchema.parse({
      teamId: "team_1",
      entityCount: 100,
      relationshipCount: 42,
    });

    expect(result.entityCount).toBe(100);
    expect(result.relationshipCount).toBe(42);
  });
});

describe("DetectPatternsOutputSchema", () => {
  it("accepts valid output", () => {
    const result = DetectPatternsOutputSchema.parse({
      patternsDetected: 3,
      clusters: 5,
      communities: 2,
    });

    expect(result.patternsDetected).toBe(3);
    expect(result.clusters).toBe(5);
    expect(result.communities).toBe(2);
  });
});

describe("DecayScoresInputSchema", () => {
  it("accepts valid input", () => {
    const result = DecayScoresInputSchema.parse({
      teamId: "team_1",
      halfLifeDays: 30,
    });

    expect(result.halfLifeDays).toBe(30);
  });

  it("rejects missing halfLifeDays", () => {
    expect(() => DecayScoresInputSchema.parse({ teamId: "team_1" })).toThrow();
  });
});

describe("DecayScoresOutputSchema", () => {
  it("accepts valid output", () => {
    const result = DecayScoresOutputSchema.parse({
      scoresDecayed: 75,
      entitiesPruned: 10,
    });

    expect(result.scoresDecayed).toBe(75);
    expect(result.entitiesPruned).toBe(10);
  });
});

describe("PersistInferenceInputSchema", () => {
  it("accepts valid input with all nested results", () => {
    const result = PersistInferenceInputSchema.parse({
      teamId: "team_1",
      inferenceRunId: "run_abc",
      mentionResult: {
        entityCount: 50,
        hasMore: false,
        nextOffset: null,
        summary: {},
      },
      expertiseResult: { scoresUpdated: 10, topExperts: [] },
      relationshipResult: {
        edgesCreated: 5,
        edgesUpdated: 12,
        edgesRemoved: 2,
      },
      patternResult: { patternsDetected: 3, clusters: 5, communities: 2 },
      decayResult: { scoresDecayed: 75, entitiesPruned: 10 },
    });

    expect(result.inferenceRunId).toBe("run_abc");
    expect(result.mentionResult.entityCount).toBe(50);
    expect(result.expertiseResult.scoresUpdated).toBe(10);
    expect(result.relationshipResult.edgesCreated).toBe(5);
    expect(result.patternResult.patternsDetected).toBe(3);
    expect(result.decayResult.scoresDecayed).toBe(75);
  });

  it("rejects missing nested results", () => {
    expect(() =>
      PersistInferenceInputSchema.parse({
        teamId: "team_1",
        inferenceRunId: "run_abc",
        mentionResult: { entityCount: 50 },
      })
    ).toThrow();
  });

  it("rejects incomplete nested result objects", () => {
    expect(() =>
      PersistInferenceInputSchema.parse({
        teamId: "team_1",
        inferenceRunId: "run_abc",
        mentionResult: {
          entityCount: 50,
          hasMore: false,
          nextOffset: null,
          summary: {},
        },
        expertiseResult: { scoresUpdated: 10, topExperts: [] },
        relationshipResult: { edgesCreated: 5 },
        patternResult: { patternsDetected: 3, clusters: 5, communities: 2 },
        decayResult: { scoresDecayed: 75, entitiesPruned: 10 },
      })
    ).toThrow();
  });
});

describe("PersistInferenceOutputSchema", () => {
  it("accepts valid output", () => {
    const result = PersistInferenceOutputSchema.parse({ persisted: true });

    expect(result.persisted).toBe(true);
  });

  it("accepts false value", () => {
    const result = PersistInferenceOutputSchema.parse({ persisted: false });

    expect(result.persisted).toBe(false);
  });

  it("rejects non-boolean persisted", () => {
    expect(() =>
      PersistInferenceOutputSchema.parse({ persisted: "yes" })
    ).toThrow();
  });
});
