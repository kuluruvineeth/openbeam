import type { TeamMediaIndex } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateTeamMediaIndexInput {
  teamId: string;
  twelveLabsIndexId: string;
  indexName: string;
}

export const createTeamMediaIndex = async (
  db: Database,
  data: CreateTeamMediaIndexInput
): Promise<TeamMediaIndex> => db.teamMediaIndex.create({ data });

export const deleteTeamMediaIndex = async (
  db: Database,
  teamId: string
): Promise<TeamMediaIndex> => db.teamMediaIndex.delete({ where: { teamId } });

export const upsertTeamMediaIndex = async (
  db: Database,
  data: CreateTeamMediaIndexInput
): Promise<TeamMediaIndex> =>
  db.teamMediaIndex.upsert({
    where: { teamId: data.teamId },
    update: {
      twelveLabsIndexId: data.twelveLabsIndexId,
      indexName: data.indexName,
    },
    create: data,
  });
