import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// TODO: Add batch insertion for high-volume impression recording
// TODO: Add deduplication logic based on queryHash + userId within time window
export async function recordSearchImpression(
  db: Database,
  data: {
    teamId: string;
    userId: string;
    experimentId: string | null;
    variant: string | null;
    query: string;
    queryHash: string;
    resultDocIds: string[];
    timing: Record<string, number> | null;
    rrfConfig: Record<string, unknown> | null;
  }
) {
  const impression = await db.searchImpression.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      experimentId: data.experimentId,
      variant: data.variant,
      query: data.query,
      queryHash: data.queryHash,
      resultDocIds: data.resultDocIds,
      timing: data.timing as Prisma.InputJsonValue | undefined,
      rrfConfig: data.rrfConfig as Prisma.InputJsonValue | undefined,
    },
  });
  return impression.id;
}

// TODO: Add upsert logic for updating dwellTimeMs on subsequent interactions
// TODO: Add validation to ensure impressionId exists before inserting click
export function recordSearchClick(
  db: Database,
  data: {
    impressionId: string;
    docId: string;
    position: number;
    dwellTimeMs: number | null;
    feedbackType: string | null;
  }
) {
  return db.searchClick.create({
    data: {
      impressionId: data.impressionId,
      docId: data.docId,
      position: data.position,
      dwellTimeMs: data.dwellTimeMs,
      feedbackType: data.feedbackType,
    },
  });
}
