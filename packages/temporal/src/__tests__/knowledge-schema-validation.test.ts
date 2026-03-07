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
} from "@openbeam/types/temporal/activities/knowledge";
import {
  ProcessKnowledgeChangesInputSchema,
  ProcessKnowledgeChangesOutputSchema,
} from "@openbeam/types/temporal/workflows/knowledge-changes";
import {
  KnowledgeInferenceInputSchema,
  KnowledgeInferenceOutputSchema,
} from "@openbeam/types/temporal/workflows/knowledge-inference";
import { describe, expect, it } from "vitest";

describe("KnowledgeInferenceInput schema", () => {
  it("accepts valid input with required fields", () => {
    const result = KnowledgeInferenceInputSchema.parse({
      teamId: "team_123",
      inferenceType: "daily",
    });

    expect(result.teamId).toBe("team_123");
    expect(result.inferenceType).toBe("daily");
  });

  it("applies default values", () => {
    const result = KnowledgeInferenceInputSchema.parse({
      teamId: "team_123",
      inferenceType: "weekly",
    });

    expect(result.decayHalfLifeDays).toBe(30);
    expect(result.coOccurrenceThreshold).toBe(3);
    expect(result.confidenceThreshold).toBe(0.6);
    expect(result.includePatternDetection).toBe(false);
  });

  it("accepts optional overrides", () => {
    const result = KnowledgeInferenceInputSchema.parse({
      teamId: "team_123",
      inferenceType: "daily",
      decayHalfLifeDays: 14,
      coOccurrenceThreshold: 5,
      confidenceThreshold: 0.8,
      includePatternDetection: true,
      remainingTeamIds: ["team_456", "team_789"],
      resumeOffset: 100,
      sinceTimestamp: 1_706_742_000_000,
    });

    expect(result.decayHalfLifeDays).toBe(14);
    expect(result.coOccurrenceThreshold).toBe(5);
    expect(result.confidenceThreshold).toBe(0.8);
    expect(result.includePatternDetection).toBe(true);
    expect(result.remainingTeamIds).toEqual(["team_456", "team_789"]);
    expect(result.resumeOffset).toBe(100);
  });

  it("rejects invalid inferenceType", () => {
    expect(() =>
      KnowledgeInferenceInputSchema.parse({
        teamId: "team_123",
        inferenceType: "monthly",
      })
    ).toThrow();
  });

  it("rejects missing teamId", () => {
    expect(() =>
      KnowledgeInferenceInputSchema.parse({ inferenceType: "daily" })
    ).toThrow();
  });
});

describe("KnowledgeInferenceOutput schema", () => {
  it("accepts valid output", () => {
    const result = KnowledgeInferenceOutputSchema.parse({
      teamId: "team_123",
      entitiesProcessed: 150,
      edgesCreated: 42,
      patternsDetected: 3,
      scoresDecayed: 75,
    });

    expect(result.teamId).toBe("team_123");
    expect(result.entitiesProcessed).toBe(150);
  });

  it("rejects missing fields", () => {
    expect(() =>
      KnowledgeInferenceOutputSchema.parse({ teamId: "team_123" })
    ).toThrow();
  });
});

describe("ProcessKnowledgeChangesInput schema", () => {
  it("accepts valid input", () => {
    const result = ProcessKnowledgeChangesInputSchema.parse({
      teamId: "team_123",
      connectorId: "conn_456",
      changeType: "incremental",
    });

    expect(result.teamId).toBe("team_123");
    expect(result.connectorId).toBe("conn_456");
    expect(result.changeType).toBe("incremental");
  });

  it("accepts full_rebuild changeType", () => {
    const result = ProcessKnowledgeChangesInputSchema.parse({
      teamId: "team_123",
      connectorId: "conn_456",
      changeType: "full_rebuild",
    });

    expect(result.changeType).toBe("full_rebuild");
  });

  it("accepts optional fields", () => {
    const result = ProcessKnowledgeChangesInputSchema.parse({
      teamId: "team_123",
      connectorId: "conn_456",
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
        teamId: "team_123",
        connectorId: "conn_456",
        changeType: "invalid",
      })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      ProcessKnowledgeChangesInputSchema.parse({ teamId: "team_123" })
    ).toThrow();
  });
});

describe("ProcessKnowledgeChangesOutput schema", () => {
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
});

describe("Activity schemas", () => {
  describe("AggregateMentions", () => {
    it("validates input", () => {
      const result = AggregateMentionsInputSchema.parse({
        teamId: "team_123",
        entityBatchOffset: 0,
        batchSize: 500,
      });

      expect(result.entityBatchOffset).toBe(0);
      expect(result.batchSize).toBe(500);
    });

    it("accepts optional sinceTimestamp", () => {
      const result = AggregateMentionsInputSchema.parse({
        teamId: "team_123",
        entityBatchOffset: 100,
        batchSize: 200,
        sinceTimestamp: 1_706_742_000_000,
      });

      expect(result.sinceTimestamp).toBe(1_706_742_000_000);
    });

    it("validates output with summary records", () => {
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
    });
  });

  describe("ComputeExpertise", () => {
    it("validates input", () => {
      const result = ComputeExpertiseInputSchema.parse({
        teamId: "team_123",
        mentionSummary: { key: "value" },
        decayHalfLifeDays: 30,
      });

      expect(result.decayHalfLifeDays).toBe(30);
    });

    it("validates output with top experts", () => {
      const result = ComputeExpertiseOutputSchema.parse({
        scoresUpdated: 10,
        topExperts: [
          { entityId: "e1", score: 8.5, domains: ["engineering", "design"] },
        ],
      });

      expect(result.topExperts).toHaveLength(1);
      expect(result.topExperts[0]?.score).toBe(8.5);
    });
  });

  describe("InferRelationships", () => {
    it("validates input", () => {
      const result = InferRelationshipsInputSchema.parse({
        teamId: "team_123",
        coOccurrenceThreshold: 3,
        confidenceThreshold: 0.6,
      });

      expect(result.coOccurrenceThreshold).toBe(3);
    });

    it("validates output", () => {
      const result = InferRelationshipsOutputSchema.parse({
        edgesCreated: 5,
        edgesUpdated: 12,
        edgesRemoved: 2,
      });

      expect(result.edgesCreated).toBe(5);
    });
  });

  describe("DetectPatterns", () => {
    it("validates input", () => {
      const result = DetectPatternsInputSchema.parse({
        teamId: "team_123",
        entityCount: 100,
        relationshipCount: 42,
      });

      expect(result.entityCount).toBe(100);
    });

    it("validates output", () => {
      const result = DetectPatternsOutputSchema.parse({
        patternsDetected: 3,
        clusters: 5,
        communities: 2,
      });

      expect(result.patternsDetected).toBe(3);
    });
  });

  describe("DecayScores", () => {
    it("validates input", () => {
      const result = DecayScoresInputSchema.parse({
        teamId: "team_123",
        halfLifeDays: 30,
      });

      expect(result.halfLifeDays).toBe(30);
    });

    it("validates output", () => {
      const result = DecayScoresOutputSchema.parse({
        scoresDecayed: 75,
        entitiesPruned: 10,
      });

      expect(result.scoresDecayed).toBe(75);
    });
  });

  describe("PersistInference", () => {
    it("validates input with nested results", () => {
      const result = PersistInferenceInputSchema.parse({
        teamId: "team_123",
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
    });

    it("validates output", () => {
      const result = PersistInferenceOutputSchema.parse({ persisted: true });

      expect(result.persisted).toBe(true);
    });

    it("rejects incomplete nested results", () => {
      expect(() =>
        PersistInferenceInputSchema.parse({
          teamId: "team_123",
          inferenceRunId: "run_abc",
          mentionResult: { entityCount: 50 },
        })
      ).toThrow();
    });
  });
});
