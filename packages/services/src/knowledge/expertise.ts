import type { Database, Entity } from "@openbeam/db";
import {
  type EvidenceItem,
  getEntityRelationByFromToAndType,
  getExpertiseRelations,
  getExpertsForTopic,
  listAllExpertiseRelationsByPerson,
  updateEntity,
  upsertEntityRelation,
} from "@openbeam/db";

export interface ExpertiseUpdate {
  personId: string;
  topicId: string;
  confidence: number;
  documentId: string;
  action: "authored" | "mentioned" | "engaged";
}

const BASE_WEIGHTS = {
  authored: 1.0,
  mentioned: 0.3,
  engaged: 0.1,
} as const;

function parseEvidenceArray(raw: unknown): EvidenceItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is EvidenceItem =>
      typeof item === "object" &&
      item !== null &&
      "docId" in item &&
      typeof item.docId === "string"
  );
}

export async function updateExpertise(
  db: Database,
  update: ExpertiseUpdate
): Promise<void> {
  const weight = calculateWeight(update.action, update.confidence);

  const existing = await getEntityRelationByFromToAndType(
    db,
    update.personId,
    update.topicId,
    "EXPERT_IN"
  );

  const newEvidence: EvidenceItem = {
    docId: update.documentId,
    action: update.action,
    weight,
    timestamp: new Date().toISOString(),
  };

  if (existing) {
    const existingEvidence = parseEvidenceArray(existing.evidence);

    await upsertEntityRelation(db, {
      fromEntityId: update.personId,
      toEntityId: update.topicId,
      relationType: "EXPERT_IN",
      weight: existing.weight + weight,
      confidence: update.confidence,
      evidence: [...existingEvidence, newEvidence],
    });
  } else {
    await upsertEntityRelation(db, {
      fromEntityId: update.personId,
      toEntityId: update.topicId,
      relationType: "EXPERT_IN",
      weight,
      confidence: update.confidence,
      evidence: [newEvidence],
    });
  }

  await recalculateExpertiseScore(db, update.personId);
}

function calculateWeight(
  action: "authored" | "mentioned" | "engaged",
  confidence: number
): number {
  return BASE_WEIGHTS[action] * confidence;
}

async function recalculateExpertiseScore(
  db: Database,
  personId: string
): Promise<void> {
  const relations = await listAllExpertiseRelationsByPerson(db, personId);

  const now = Date.now();
  let totalScore = 0;

  for (const rel of relations) {
    const daysSinceUpdate =
      (now - rel.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-daysSinceUpdate / 365);
    totalScore += rel.weight * decayFactor;
  }

  await updateEntity(db, personId, { expertiseScore: totalScore });
}

export async function getTopExperts(
  db: Database,
  _teamId: string,
  topicId: string,
  limit = 10
): Promise<Array<{ person: Entity; score: number }>> {
  const relations = await getExpertsForTopic(db, topicId, limit);

  return relations.map((rel) => ({
    person: rel.fromEntity,
    score: rel.weight,
  }));
}

export async function getPersonExpertise(
  db: Database,
  personId: string,
  limit = 20
): Promise<Array<{ topic: Entity; score: number }>> {
  const relations = await getExpertiseRelations(db, personId, limit);

  return relations.map((rel) => ({
    topic: rel.toEntity,
    score: rel.weight,
  }));
}

export async function processDocumentExpertise(
  db: Database,
  documentId: string,
  authorId: string,
  topics: Array<{ entityId: string; confidence: number }>
): Promise<void> {
  for (const topic of topics) {
    await updateExpertise(db, {
      personId: authorId,
      topicId: topic.entityId,
      confidence: topic.confidence,
      documentId,
      action: "authored",
    });
  }
}
