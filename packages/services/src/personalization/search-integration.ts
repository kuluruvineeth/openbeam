import type { Database } from "@openbeam/db";
import type { RankedDocument } from "../search/types";
import { resolveUserProfile } from "./resolver";
import { computePersonalizationScores } from "./scoring";
import type {
  DocumentForScoring,
  PersonalizationContext,
  PersonalizationScores,
} from "./types";

export interface PersonalizedDocument extends RankedDocument {
  personalization: PersonalizationScores;
  finalScore: number;
}

const PERSONALIZATION_BLEND = 0.15;

export async function applyPersonalization(
  db: Database,
  ctx: PersonalizationContext,
  results: RankedDocument[]
): Promise<PersonalizedDocument[]> {
  if (results.length === 0) {
    return [];
  }

  const profile = await resolveUserProfile(db, ctx);

  if (!profile.personalizationEnabled) {
    return results.map((r) => ({
      ...r,
      personalization: {
        docId: r.document.id,
        connectorBoost: 0,
        authorBoost: 0,
        topicBoost: 0,
        embeddingBoost: 0,
        recencyBoost: 0,
        totalBoost: 0,
      },
      finalScore: r.score,
    }));
  }

  const documentsForScoring: DocumentForScoring[] = results.map((r) => ({
    docId: r.document.id,
    connectorType: r.document.connector_type,
    authorId: r.document.author_id ?? null,
    topicIds: extractTopicIds(r.document.metadata),
    embedding: null,
    createdAt: new Date(r.document.created_at * 1000),
    updatedAt: new Date(r.document.updated_at * 1000),
  }));

  const scores = computePersonalizationScores(profile, documentsForScoring);
  const scoresMap = new Map(scores.map((s) => [s.docId, s]));

  const personalizedResults = results.map((r) => {
    const personalization = scoresMap.get(r.document.id) ?? {
      docId: r.document.id,
      connectorBoost: 0,
      authorBoost: 0,
      topicBoost: 0,
      embeddingBoost: 0,
      recencyBoost: 0,
      totalBoost: 0,
    };

    const baseScore = r.score;
    const personalizedScore =
      baseScore * (1 + personalization.totalBoost * PERSONALIZATION_BLEND);

    return {
      ...r,
      personalization,
      finalScore: personalizedScore,
    };
  });

  return personalizedResults.sort((a, b) => b.finalScore - a.finalScore);
}

function extractTopicIds(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const meta = metadata as Record<string, unknown>;

  if (Array.isArray(meta.topicIds)) {
    return meta.topicIds.filter((id): id is string => typeof id === "string");
  }

  if (Array.isArray(meta.topics)) {
    return meta.topics
      .filter(
        (t): t is { id: string } =>
          typeof t === "object" && t !== null && "id" in t
      )
      .map((t) => t.id);
  }

  return [];
}

export function shouldPersonalize(mode: string): boolean {
  return mode.includes("enterprise") || mode.includes("personalized");
}
