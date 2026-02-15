import type { ConnectorStatus } from "../../prisma/generated/client";
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

export const listTeamsWithConnectors = async (
  db: Database,
  status?: ConnectorStatus
) =>
  db.team.findMany({
    where: {
      connectors: {
        some: status ? { status } : {},
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

export const getTeamMembership = async (
  db: Database,
  userId: string,
  teamId: string
) =>
  db.usersOnTeam.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  });

export const resolveTeamWriteUserId = async (
  db: Database,
  teamId: string
): Promise<string | null> => {
  const adminMembership = await db.usersOnTeam.findFirst({
    where: {
      teamId,
      role: {
        in: ["OWNER", "ADMIN"],
      },
    },
    select: {
      userId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (adminMembership) {
    return adminMembership.userId;
  }

  const anyMembership = await db.usersOnTeam.findFirst({
    where: {
      teamId,
    },
    select: {
      userId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return anyMembership?.userId ?? null;
};

export const getTeamSummaryById = async (db: Database, teamId: string) =>
  db.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
    },
  });

export const findTeamBySlug = async (db: Database, slug: string) =>
  db.team.findUnique({
    where: { slug },
    select: { id: true },
  });
