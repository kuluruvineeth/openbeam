import type {
  DocumentForScoring,
  PersonalizationScores,
  ResolvedUserProfile,
} from "./types";
import { cosineSimilarity } from "./utils";

const CONNECTOR_WEIGHT = 0.25;
const AUTHOR_WEIGHT = 0.2;
const TOPIC_WEIGHT = 0.25;
const EMBEDDING_WEIGHT = 0.2;
const RECENCY_WEIGHT = 0.1;

const MAX_CONNECTOR_BOOST = 0.3;
const MAX_AUTHOR_BOOST = 0.4;
const MAX_TOPIC_BOOST = 0.3;
const MAX_EMBEDDING_BOOST = 0.5;
const MAX_RECENCY_BOOST = 0.2;

export function computePersonalizationScores(
  profile: ResolvedUserProfile,
  documents: DocumentForScoring[]
): PersonalizationScores[] {
  if (!profile.personalizationEnabled || profile.isNewUser) {
    return documents.map((doc) => ({
      docId: doc.docId,
      connectorBoost: 0,
      authorBoost: 0,
      topicBoost: 0,
      embeddingBoost: 0,
      recencyBoost: 0,
      totalBoost: 0,
    }));
  }

  return documents.map((doc) => scoreDocument(profile, doc));
}

function scoreDocument(
  profile: ResolvedUserProfile,
  doc: DocumentForScoring
): PersonalizationScores {
  const connectorBoost = computeConnectorBoost(profile, doc.connectorType);
  const authorBoost = computeAuthorBoost(profile, doc.authorId);
  const topicBoost = computeTopicBoost(profile, doc.topicIds);
  const embeddingBoost = computeEmbeddingBoost(profile, doc.embedding);
  const recencyBoost = computeRecencyBoost(doc.updatedAt);

  const totalBoost =
    CONNECTOR_WEIGHT * connectorBoost +
    AUTHOR_WEIGHT * authorBoost +
    TOPIC_WEIGHT * topicBoost +
    EMBEDDING_WEIGHT * embeddingBoost +
    RECENCY_WEIGHT * recencyBoost;

  return {
    docId: doc.docId,
    connectorBoost,
    authorBoost,
    topicBoost,
    embeddingBoost,
    recencyBoost,
    totalBoost,
  };
}

function computeConnectorBoost(
  profile: ResolvedUserProfile,
  connectorType: string
): number {
  const weight = profile.connectorWeights[connectorType];
  if (!weight) {
    return 0;
  }

  const maxWeight = Math.max(...Object.values(profile.connectorWeights), 1);
  const normalized = weight / maxWeight;

  return Math.min(normalized * MAX_CONNECTOR_BOOST, MAX_CONNECTOR_BOOST);
}

function computeAuthorBoost(
  profile: ResolvedUserProfile,
  authorId: string | null
): number {
  if (!authorId) {
    return 0;
  }

  const interactions = profile.authorInteractions[authorId];
  if (!interactions) {
    return 0;
  }

  const maxInteractions = Math.max(
    ...Object.values(profile.authorInteractions),
    1
  );
  const normalized = Math.log1p(interactions) / Math.log1p(maxInteractions);

  return Math.min(normalized * MAX_AUTHOR_BOOST, MAX_AUTHOR_BOOST);
}

function computeTopicBoost(
  profile: ResolvedUserProfile,
  topicIds: string[]
): number {
  if (topicIds.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let matchCount = 0;

  for (const topicId of topicIds) {
    const weight = profile.topicWeights[topicId];
    if (weight) {
      totalWeight += weight;
      matchCount += 1;
    }
  }

  if (matchCount === 0) {
    return 0;
  }

  const avgWeight = totalWeight / matchCount;
  const maxWeight = Math.max(...Object.values(profile.topicWeights), 1);
  const normalized = avgWeight / maxWeight;

  return Math.min(normalized * MAX_TOPIC_BOOST, MAX_TOPIC_BOOST);
}

function computeEmbeddingBoost(
  profile: ResolvedUserProfile,
  docEmbedding: number[] | null
): number {
  if (!(docEmbedding && profile.docEmbedding)) {
    return 0;
  }

  const similarity = cosineSimilarity(profile.docEmbedding, docEmbedding);
  const normalized = (similarity + 1) / 2;

  return Math.min(normalized * MAX_EMBEDDING_BOOST, MAX_EMBEDDING_BOOST);
}

function computeRecencyBoost(updatedAt: Date): number {
  const daysSinceUpdate =
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate < 1) {
    return MAX_RECENCY_BOOST;
  }
  if (daysSinceUpdate < 7) {
    return MAX_RECENCY_BOOST * 0.8;
  }
  if (daysSinceUpdate < 30) {
    return MAX_RECENCY_BOOST * 0.5;
  }
  if (daysSinceUpdate < 90) {
    return MAX_RECENCY_BOOST * 0.2;
  }

  return 0;
}
