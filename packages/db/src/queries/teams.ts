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

export async function getTeamWithCounts(db: Database, teamId: string) {
  const [team, connectorCount, memberCount, documentCount] = await Promise.all([
    db.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionTier: true,
        createdAt: true,
      },
    }),
    db.connector.count({ where: { teamId } }),
    db.usersOnTeam.count({ where: { teamId } }),
    db.indexedDocument.count({ where: { connector: { teamId } } }),
  ]);
  if (!team) {
    return null;
  }
  return { ...team, connectorCount, memberCount, documentCount };
}

export async function getTeamPlanTier(
  db: Database,
  teamId: string
): Promise<string> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { subscriptionTier: true },
  });
  return team?.subscriptionTier ?? "free";
}

export async function listTeamMembers(db: Database, teamId: string) {
  const members = await db.usersOnTeam.findMany({
    where: { teamId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: m.role,
    createdAt: m.createdAt,
  }));
}
