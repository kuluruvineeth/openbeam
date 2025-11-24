import type { Database } from "..";

export const listUserTeams = async (db: Database, userId: string) => {
  const memberships = await db.usersOnTeam.findMany({
    where: { userId },
    include: {
      team: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map((membership) => ({
    id: membership.team.id,
    name: membership.team.name,
    slug: membership.team.slug,
    logoUrl: membership.team.logo ?? null,
    role: membership.role,
  }));
};

export const updateActiveTeamForUser = async (
  db: Database,
  userId: string,
  teamId: string
) => {
  const membership = await db.usersOnTeam.findFirst({
    where: {
      userId,
      teamId,
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this team");
  }

  await db.user.update({
    where: { id: userId },
    data: { teamId },
  });
};
