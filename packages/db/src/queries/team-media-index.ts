import type { TeamMediaIndex } from "../../prisma/generated/client";
import type { Database } from "../index";

export const findTeamMediaIndex = async (
  db: Database,
  teamId: string
): Promise<TeamMediaIndex | null> =>
  db.teamMediaIndex.findUnique({ where: { teamId } });

export const getTeamTwelveLabsIndexId = async (
  db: Database,
  teamId: string
): Promise<string | null> => {
  const index = await db.teamMediaIndex.findUnique({
    where: { teamId },
    select: { twelveLabsIndexId: true },
  });
  return index?.twelveLabsIndexId ?? null;
};
