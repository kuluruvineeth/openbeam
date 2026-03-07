import db, { getTrainingDataForExport } from "@openbeam/db";
import type {
  ExportTrainingDataInput,
  ExportTrainingDataOutput,
  TrainingImpression,
} from "./types";

const MIN_CLICKS_PER_QUERY = 1;

function computePositionBasedFeatures(
  position: number,
  _totalResults: number
): Record<string, number> {
  const decayFactor = Math.exp(-position * 0.1);

  return {
    bm25_title: 0.8 * decayFactor + 0.1,
    bm25_content: 0.7 * decayFactor + 0.1,
    dense_score: 0.85 * decayFactor + 0.1,
    sparse_score: 0.6 * decayFactor + 0.1,
    rerank_score: 0.9 * decayFactor + 0.05,
    recency_days: Math.floor(position * 2 + Math.random() * 10),
    doc_length: 500 + Math.floor(Math.random() * 2000),
    title_length: 20 + Math.floor(Math.random() * 80),
    view_count: Math.max(0, 50 - position * 3 + Math.floor(Math.random() * 20)),
    reaction_count: Math.max(0, Math.floor(5 - position * 0.3)),
    reply_count: Math.max(0, Math.floor(3 - position * 0.2)),
    trending_score: 0.5 * decayFactor,
    authority_score: 0.7 * decayFactor + 0.2,
    title_exact_match: position === 0 ? 1 : 0,
    title_partial_match: position < 3 ? 1 : 0,
    connector_type_encoded: 0,
    document_type_encoded: 0,
    department_match: 0,
    author_interaction_count: 0,
  };
}

export async function exportTrainingData(
  input: ExportTrainingDataInput
): Promise<ExportTrainingDataOutput> {
  const { teamId, fromDate, toDate, minClicksPerQuery } = input;

  const trainingData = await getTrainingDataForExport(db, {
    teamId,
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
    minClicksPerQuery: minClicksPerQuery ?? MIN_CLICKS_PER_QUERY,
  });

  const impressions: TrainingImpression[] = trainingData.map((impression) => ({
    id: impression.id,
    query: impression.query,
    resultDocIds: impression.resultDocIds,
    clicks: impression.clicks.map((click) => ({
      docId: click.docId,
      position: click.position,
      dwellTimeMs: click.dwellTimeMs,
      feedbackType: click.feedbackType,
    })),
  }));

  const featuresByDoc: Record<string, Record<string, number>> = {};
  for (const imp of trainingData) {
    const totalResults = imp.resultDocIds.length;
    for (let position = 0; position < totalResults; position++) {
      const docId = imp.resultDocIds[position] as string;
      if (!featuresByDoc[docId]) {
        featuresByDoc[docId] = computePositionBasedFeatures(
          position,
          totalResults
        );
      }
    }
  }

  return { impressions, featuresByDoc };
}
