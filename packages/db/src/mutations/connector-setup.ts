import type { AppType } from "../../prisma/generated/client";
import type { Database } from "..";

export async function createSetupSession(
  db: Database,
  params: {
    teamId: string;
    userId: string;
    appType: AppType;
    expiresAt: Date;
  }
) {
  return await db.connectorSetupSession.create({
    data: {
      teamId: params.teamId,
      userId: params.userId,
      appType: params.appType,
      status: "PENDING",
      expiresAt: params.expiresAt,
    },
  });
}

export async function completeSetupSession(
  db: Database,
  params: {
    teamId: string;
    appType: AppType;
    connectorId: string;
  }
) {
  return await db.connectorSetupSession.updateMany({
    where: {
      teamId: params.teamId,
      appType: params.appType,
      status: "PENDING",
    },
    data: {
      status: "COMPLETED",
      connectorId: params.connectorId,
    },
  });
}

export async function failSetupSession(
  db: Database,
  sessionId: string,
  errorMessage: string
) {
  return await db.connectorSetupSession.update({
    where: { id: sessionId },
    data: { status: "FAILED", errorMessage },
  });
}

export async function getSetupSession(
  db: Database,
  sessionId: string,
  teamId: string
) {
  return await db.connectorSetupSession.findFirst({
    where: { id: sessionId, teamId },
  });
}

export async function expireStaleSetupSessions(db: Database) {
  return await db.connectorSetupSession.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

export async function expireSetupSession(db: Database, sessionId: string) {
  return await db.connectorSetupSession.update({
    where: { id: sessionId },
    data: { status: "EXPIRED" },
  });
}
