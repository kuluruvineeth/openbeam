import type { Database } from "..";

export const getTeamsEligibleForTraining = async (
  db: Database,
  params: {
    minSamples: number;
    fromDate: Date;
    toDate: Date;
  }
) => {
  const teamsWithSamples = await db.searchImpression.groupBy({
    by: ["teamId"],
    where: {
      createdAt: {
        gte: params.fromDate,
        lte: params.toDate,
      },
      clicks: {
        some: {},
      },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gte: params.minSamples,
        },
      },
    },
  });

  return teamsWithSamples.map((t) => t.teamId);
};
