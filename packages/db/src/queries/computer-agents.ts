import type { Database } from "../index";

export function getComputerAgents(db: Database, teamId: string) {
  return db.computerAgent.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      source: true,
      templateId: true,
      status: true,
      mode: true,
      scheduleCron: true,
      createdAt: true,
    },
  });
}

export function getComputerAgentById(db: Database, id: string) {
  return db.computerAgent.findUnique({ where: { id } });
}

export function getComputerAgentBySlug(
  db: Database,
  teamId: string,
  slug: string
) {
  return db.computerAgent.findUnique({
    where: { teamId_slug: { teamId, slug } },
    select: { id: true },
  });
}

export function getComputerAgentForRun(
  db: Database,
  id: string,
  teamId: string
) {
  return db.computerAgent.findFirst({
    where: { id, teamId },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      status: true,
      mode: true,
      config: true,
      createdBy: true,
    },
  });
}

export function getEnabledScheduledAgents(db: Database) {
  return db.computerAgent.findMany({
    where: {
      status: "ACTIVE",
      scheduleCron: { not: null },
    },
    select: {
      id: true,
      teamId: true,
      slug: true,
      scheduleCron: true,
      createdBy: true,
      createdByUser: { select: { timezone: true } },
    },
  });
}

export function getUserTimezone(db: Database, userId: string) {
  return db.user
    .findUnique({ where: { id: userId }, select: { timezone: true } })
    .then((u) => u?.timezone ?? null);
}
