import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  getExpertsForTopicForTeam,
  getKnowledgeEntityForTeam,
  getKnowledgePanelForTeam,
  getPersonExpertiseForTeam,
  KnowledgeServiceError,
  listKnowledgeEntitiesForTeam,
} from "../knowledge-api";

function createDatabaseStub(options?: {
  entityTeamId?: string;
  entityType?:
    | "PERSON"
    | "TEAM"
    | "PROJECT"
    | "TOPIC"
    | "TECHNOLOGY"
    | "LOCATION"
    | "ORGANIZATION"
    | "CHANNEL"
    | "REPOSITORY";
}) {
  const entityTeamId = options?.entityTeamId ?? "team_1";
  const entityType = options?.entityType ?? "PERSON";
  const entities = [
    {
      id: "entity_1",
      teamId: entityTeamId,
      type: entityType,
      name: "Entity One",
      aliases: [],
      expertiseScore: 10,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date("2026-02-15T00:00:00.000Z"),
    },
    {
      id: "entity_2",
      teamId: entityTeamId,
      type: "TOPIC",
      name: "Entity Two",
      aliases: [],
      expertiseScore: 9,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date("2026-02-15T00:00:00.000Z"),
    },
  ];

  const db = {
    entity: {
      findUnique: async (input: { where: { id: string } }) =>
        entities.find((entity) => entity.id === input.where.id) ?? null,
      findMany: async (input: { take?: number }) =>
        typeof input.take === "number"
          ? entities.slice(0, input.take)
          : entities,
    },
    entityRelation: {
      findMany: (input: {
        where: {
          fromEntityId?: string;
          toEntityId?: string;
          relationType?: string;
        };
        include?: {
          toEntity?: boolean;
          fromEntity?: boolean;
        };
      }) => {
        if (
          input.where.relationType === "EXPERT_IN" &&
          input.include?.toEntity
        ) {
          return [
            {
              id: "rel_expertise",
              weight: 0.92,
              toEntity: {
                id: "topic_1",
                teamId: "team_1",
                type: "TOPIC",
                name: "AI Systems",
              },
            },
          ];
        }

        if (
          input.where.relationType === "EXPERT_IN" &&
          input.include?.fromEntity
        ) {
          return [
            {
              id: "rel_expert",
              weight: 0.88,
              fromEntity: {
                id: "person_1",
                teamId: "team_1",
                type: "PERSON",
                name: "Jordan",
              },
            },
          ];
        }

        if (input.include?.toEntity) {
          return [
            {
              id: "rel_outgoing",
              weight: 0.7,
              toEntity: {
                id: "entity_2",
                teamId: "team_1",
                type: "TOPIC",
                name: "Entity Two",
              },
            },
          ];
        }

        if (input.include?.fromEntity) {
          return [
            {
              id: "rel_incoming",
              weight: 0.5,
              fromEntity: {
                id: "person_2",
                teamId: "team_1",
                type: "PERSON",
                name: "Taylor",
              },
            },
          ];
        }

        return [];
      },
    },
    entityMention: {
      findMany: async () => [
        {
          id: "mention_1",
          entityId: "entity_1",
          documentId: "doc_1",
          context: "Mention context",
          createdAt: new Date("2026-02-15T00:00:00.000Z"),
        },
      ],
    },
  } as unknown as Database;

  return db;
}

describe("knowledge api service", () => {
  it("lists entities with pagination metadata", async () => {
    const db = createDatabaseStub();

    const result = await listKnowledgeEntitiesForTeam(db, {
      teamId: "team_1",
      limit: 1,
    });

    expect(result.items.length).toBe(1);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("entity_1");
  });

  it("returns not found when entity belongs to another team", async () => {
    const db = createDatabaseStub({ entityTeamId: "team_2" });

    await expect(
      getKnowledgeEntityForTeam(db, {
        teamId: "team_1",
        entityId: "entity_1",
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns panel with expertise and recent mentions for a person", async () => {
    const db = createDatabaseStub({ entityType: "PERSON" });

    const panel = await getKnowledgePanelForTeam(db, {
      teamId: "team_1",
      entityId: "entity_1",
    });

    expect(panel.expertise.length).toBe(1);
    expect(panel.recentMentions.length).toBe(1);
    expect(panel.relations.outgoing.length).toBe(1);
    expect(panel.relations.incoming.length).toBe(1);
  });

  it("returns experts for a topic", async () => {
    const db = createDatabaseStub({ entityType: "TOPIC" });

    const experts = await getExpertsForTopicForTeam(db, {
      teamId: "team_1",
      topicId: "entity_1",
      limit: 5,
    });

    expect(experts.experts.length).toBe(1);
    expect(experts.experts[0]?.person.id).toBe("person_1");
  });

  it("rejects expertise lookup for non-person entities", async () => {
    const db = createDatabaseStub({ entityType: "TOPIC" });

    await expect(
      getPersonExpertiseForTeam(db, {
        teamId: "team_1",
        personId: "entity_1",
        limit: 5,
      })
    ).rejects.toBeInstanceOf(KnowledgeServiceError);
  });
});
