import type { Database } from "..";

export const getUserById = async (db: Database, id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      team: true,
      usersOnTeam: {
        include: {
          team: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    ...user,
    teamId: user.teamId,
    team: user.team,
  };
};
