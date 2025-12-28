import type { Database } from "../index";

export function getActiveExperiment(db: Database, teamId: string) {
  return db.searchExperiment.findFirst({
    where: {
      teamId,
      status: "active",
    },
  });
}

export function getSearchImpressions(
  db: Database,
  params: {
    teamId: string;
    fromDate: Date;
    toDate: Date;
    experimentId?: string;
  }
) {
  return db.searchImpression.findMany({
    where: {
      teamId: params.teamId,
      createdAt: {
        gte: params.fromDate,
        lte: params.toDate,
      },
      ...(params.experimentId && { experimentId: params.experimentId }),
    },
  });
}

export function getSearchClicks(db: Database, impressionIds: string[]) {
  return db.searchClick.findMany({
    where: {
      impressionId: { in: impressionIds },
    },
  });
}
