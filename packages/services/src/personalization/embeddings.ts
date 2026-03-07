import {
  createUserSearchProfile,
  type Database,
  findUserSearchProfile,
  type RecentClick,
  type RecentQuery,
  updateDocEmbedding as updateDocEmbeddingDb,
  updateQueryEmbedding as updateQueryEmbeddingDb,
} from "@openbeam/db";
import { deserializeEmbedding, hashQuery, serializeEmbedding } from "./utils";

interface EmbeddingUpdateContext {
  db: Database;
  userId: string;
  teamId: string;
}

const QUERY_EMBEDDING_ALPHA = 0.1;
const DOC_EMBEDDING_ALPHA = 0.15;
const MAX_RECENT_QUERIES = 50;
const MAX_RECENT_CLICKS = 100;

export async function updateQueryEmbedding(
  ctx: EmbeddingUpdateContext,
  queryEmbedding: number[],
  query: string
): Promise<void> {
  const profile = await findUserSearchProfile(ctx.db, ctx.userId, ctx.teamId);

  if (!profile) {
    const newQuery: RecentQuery = {
      query,
      queryHash: hashQuery(query),
      timestamp: Date.now(),
      resultCount: 0,
    };

    await createUserSearchProfile(ctx.db, {
      userId: ctx.userId,
      teamId: ctx.teamId,
      queryEmbedding: serializeEmbedding(queryEmbedding),
      recentQueries: [newQuery],
    });
    return;
  }

  let newEmbedding: number[];

  if (profile.queryEmbedding) {
    const currentEmbedding = deserializeEmbedding(profile.queryEmbedding);
    newEmbedding = exponentialMovingAverage(
      currentEmbedding,
      queryEmbedding,
      QUERY_EMBEDDING_ALPHA
    );
  } else {
    newEmbedding = queryEmbedding;
  }

  const recentQueries = profile.recentQueries.slice(0, MAX_RECENT_QUERIES - 1);
  recentQueries.unshift({
    query,
    queryHash: hashQuery(query),
    timestamp: Date.now(),
    resultCount: 0,
  });

  await updateQueryEmbeddingDb(ctx.db, ctx.userId, ctx.teamId, {
    queryEmbedding: serializeEmbedding(newEmbedding),
    recentQueries,
  });
}

export type { RecentClick };

export async function updateDocEmbedding(
  ctx: EmbeddingUpdateContext,
  docEmbedding: number[],
  clickData: RecentClick
): Promise<void> {
  const profile = await findUserSearchProfile(ctx.db, ctx.userId, ctx.teamId);

  if (!profile) {
    const connectorWeights: Record<string, number> = {
      [clickData.connectorType]: 1,
    };

    await createUserSearchProfile(ctx.db, {
      userId: ctx.userId,
      teamId: ctx.teamId,
      docEmbedding: serializeEmbedding(docEmbedding),
      recentClicks: [clickData],
      connectorWeights,
    });
    return;
  }

  let newEmbedding: number[];

  if (profile.docEmbedding) {
    const currentEmbedding = deserializeEmbedding(profile.docEmbedding);
    newEmbedding = exponentialMovingAverage(
      currentEmbedding,
      docEmbedding,
      DOC_EMBEDDING_ALPHA
    );
  } else {
    newEmbedding = docEmbedding;
  }

  const recentClicks = profile.recentClicks.slice(0, MAX_RECENT_CLICKS - 1);
  recentClicks.unshift(clickData);

  const connectorWeights = { ...profile.connectorWeights };
  connectorWeights[clickData.connectorType] =
    (connectorWeights[clickData.connectorType] ?? 0) + 1;

  const authorInteractions = { ...profile.authorInteractions };
  if (clickData.authorId) {
    authorInteractions[clickData.authorId] =
      (authorInteractions[clickData.authorId] ?? 0) + 1;
  }

  const topicWeights = { ...profile.topicWeights };
  for (const topicId of clickData.topicIds) {
    topicWeights[topicId] = (topicWeights[topicId] ?? 0) + 1;
  }

  await updateDocEmbeddingDb(ctx.db, ctx.userId, ctx.teamId, {
    docEmbedding: serializeEmbedding(newEmbedding),
    recentClicks,
    connectorWeights,
    authorInteractions,
    topicWeights,
    avgDwellMs: computeRunningAverage(
      profile.avgDwellMs,
      profile.clickCount,
      clickData.dwellMs
    ),
  });
}

function exponentialMovingAverage(
  current: number[],
  update: number[],
  alpha: number
): number[] {
  if (current.length !== update.length) {
    return update;
  }

  return current.map((c, i) => alpha * (update[i] ?? 0) + (1 - alpha) * c);
}

function computeRunningAverage(
  currentAvg: number | null,
  count: number,
  newValue: number
): number {
  if (currentAvg === null || count === 0) {
    return newValue;
  }
  return (currentAvg * count + newValue) / (count + 1);
}
