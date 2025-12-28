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

export interface TrainingDataExportParams {
  teamId: string;
  fromDate: Date;
  toDate: Date;
  minClicksPerQuery?: number;
}

export async function getTrainingDataForExport(
  db: Database,
  params: TrainingDataExportParams
) {
  const impressions = await db.searchImpression.findMany({
    where: {
      teamId: params.teamId,
      createdAt: {
        gte: params.fromDate,
        lte: params.toDate,
      },
    },
    include: {
      clicks: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const minClicks = params.minClicksPerQuery ?? 1;
  return impressions.filter(
    (impression) => impression.clicks.length >= minClicks
  );
}

export function countTrainingSamples(
  db: Database,
  params: { teamId: string; fromDate: Date; toDate: Date }
) {
  return db.searchImpression.count({
    where: {
      teamId: params.teamId,
      createdAt: {
        gte: params.fromDate,
        lte: params.toDate,
      },
      clicks: {
        some: {},
      },
    },
  });
}
