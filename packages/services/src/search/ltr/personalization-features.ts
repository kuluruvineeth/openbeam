import type { DocumentFeatures, UserContext } from "./types";

interface DocumentForFeatures {
  connectorType: string;
  authorId: string | null;
  topicIds: string[];
  embedding: number[] | null;
}

export function extractPersonalizationFeatures(
  userContext: UserContext,
  doc: DocumentForFeatures
): Partial<DocumentFeatures> {
  return {
    userQuerySimilarity: computeQuerySimilarity(userContext, doc.embedding),
    userDocSimilarity: computeDocSimilarity(userContext, doc.embedding),
    connectorPreference: userContext.connectorWeights[doc.connectorType] ?? 0,
    authorAffinity: doc.authorId
      ? (userContext.authorInteractions[doc.authorId] ?? 0)
      : 0,
    topicAffinity: computeTopicAffinity(userContext, doc.topicIds),
    isFromPreferredConnector: isPreferredConnector(
      userContext,
      doc.connectorType
    ),
    isFromKnownAuthor: doc.authorId
      ? !!userContext.authorInteractions[doc.authorId]
      : false,
  };
}

function computeQuerySimilarity(
  userContext: UserContext,
  docEmbedding: number[] | null
): number {
  if (!(userContext.queryEmbedding && docEmbedding)) {
    return 0;
  }
  return cosineSimilarity(userContext.queryEmbedding, docEmbedding);
}

function computeDocSimilarity(
  userContext: UserContext,
  docEmbedding: number[] | null
): number {
  if (!(userContext.docEmbedding && docEmbedding)) {
    return 0;
  }
  return cosineSimilarity(userContext.docEmbedding, docEmbedding);
}

function computeTopicAffinity(
  userContext: UserContext,
  topicIds: string[]
): number {
  if (topicIds.length === 0 || !userContext.topicWeights) {
    return 0;
  }

  let totalWeight = 0;
  for (const topicId of topicIds) {
    totalWeight += userContext.topicWeights[topicId] ?? 0;
  }

  return totalWeight / topicIds.length;
}

function isPreferredConnector(
  userContext: UserContext,
  connectorType: string
): boolean {
  const weights = Object.entries(userContext.connectorWeights);
  if (weights.length === 0) {
    return false;
  }

  const maxConnector = weights.reduce((a, b) => (a[1] > b[1] ? a : b));
  return maxConnector[0] === connectorType;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
