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

const SCHEDULER_LOCK_ID = 8_675_309;

export async function acquireSchedulerLock(db: Database): Promise<boolean> {
  const result = await db.$queryRaw<Array<{ acquired: boolean }>>`
    SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_ID}) as "acquired"
  `;
  return result[0]?.acquired ?? false;
}

export async function releaseSchedulerLock(db: Database): Promise<void> {
  await db.$queryRaw`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_ID})`;
}
