import type { Entity, EntityRelation, EntityType } from "@openplane/db";
import {
  type Database,
  getEntityById,
  getEntityMentions,
  getEntityRelations,
  getExpertiseRelations,
  getExpertsForTopic,
  listEntities,
  searchEntities,
} from "@openplane/db";
import { createResolveTeamId } from "./lib/service-errors";

export type KnowledgeServiceErrorCode = "MISSING_TEAM" | "NOT_FOUND";

export class KnowledgeServiceError extends Error {
  readonly code: KnowledgeServiceErrorCode;

  constructor(code: KnowledgeServiceErrorCode, message: string) {
    super(message);
    this.name = "KnowledgeServiceError";
    this.code = code;
  }
}

const resolveTeamId = createResolveTeamId(KnowledgeServiceError);

async function resolveEntity(
  db: Database,
  input: {
    entityId: string;
    teamId: string;
    notFoundMessage: string;
  }
) {
  const entity = await getEntityById(db, input.entityId);
  if (!entity || entity.teamId !== input.teamId) {
    throw new KnowledgeServiceError("NOT_FOUND", input.notFoundMessage);
  }
  return entity;
}

export async function listKnowledgeEntitiesForTeam(
  db: Database,
  input: {
    teamId: string | null;
    type?: EntityType;
    cursor?: string;
    limit: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await listEntities(db, {
    teamId,
    type: input.type,
    cursor: input.cursor,
    limit: input.limit,
  });
}

export async function searchKnowledgeEntitiesForTeam(
  db: Database,
  input: {
    teamId: string | null;
    query: string;
    type?: EntityType;
    limit: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const items = await searchEntities(db, {
    teamId,
    query: input.query,
    type: input.type,
    limit: input.limit,
  });

  return { items };
}

export async function getKnowledgeEntityForTeam(
  db: Database,
  input: {
    teamId: string | null;
    entityId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await resolveEntity(db, {
    entityId: input.entityId,
    teamId,
    notFoundMessage: "Entity not found",
  });
}

export async function getKnowledgeRelationsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    entityId: string;
    direction?: "outgoing" | "incoming" | "both";
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await resolveEntity(db, {
    entityId: input.entityId,
    teamId,
    notFoundMessage: "Entity not found",
  });

  return getEntityRelations(db, {
    entityId: input.entityId,
    direction: input.direction,
  });
}

export async function getKnowledgePanelForTeam(
  db: Database,
  input: {
    teamId: string | null;
    entityId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const entity = await resolveEntity(db, {
    entityId: input.entityId,
    teamId,
    notFoundMessage: "Entity not found",
  });

  const [relations, expertise, recentMentions] = await Promise.all([
    getEntityRelations(db, {
      entityId: input.entityId,
      direction: "both",
    }),
    entity.type === "PERSON"
      ? getExpertiseRelations(db, input.entityId, 5)
      : Promise.resolve([]),
    getEntityMentions(db, input.entityId, 5),
  ]);

  return {
    entity,
    relations,
    expertise: expertise.map(
      (relation: EntityRelation & { toEntity: Entity }) => ({
        topic: relation.toEntity,
        score: relation.weight,
      })
    ),
    recentMentions,
  };
}

export async function getExpertsForTopicForTeam(
  db: Database,
  input: {
    teamId: string | null;
    topicId: string;
    limit: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);

  await resolveEntity(db, {
    entityId: input.topicId,
    teamId,
    notFoundMessage: "Topic not found",
  });

  const relations = await getExpertsForTopic(db, input.topicId, input.limit);

  return {
    experts: relations.map(
      (relation: EntityRelation & { fromEntity: Entity }) => ({
        person: relation.fromEntity,
        score: relation.weight,
      })
    ),
  };
}

export async function getPersonExpertiseForTeam(
  db: Database,
  input: {
    teamId: string | null;
    personId: string;
    limit: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const person = await resolveEntity(db, {
    entityId: input.personId,
    teamId,
    notFoundMessage: "Person not found",
  });

  if (person.type !== "PERSON") {
    throw new KnowledgeServiceError("NOT_FOUND", "Person not found");
  }

  const relations = await getExpertiseRelations(
    db,
    input.personId,
    input.limit
  );

  return {
    expertise: relations.map(
      (relation: EntityRelation & { toEntity: Entity }) => ({
        topic: relation.toEntity,
        score: relation.weight,
      })
    ),
  };
}
