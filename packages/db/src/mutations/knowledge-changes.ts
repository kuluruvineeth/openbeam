import type {
  ChangeSource,
  ChangeType,
  Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export function createDocumentChanges(
  db: Database,
  data: {
    teamId: string;
    connectorId: string;
    changes: Array<{
      documentId: string;
      changeType: ChangeType;
      source?: ChangeSource;
      changedBy?: string;
      changedFields?: string[];
      metadata?: Prisma.InputJsonValue;
      eventTime?: Date;
    }>;
  }
) {
  return db.documentChange.createMany({
    data: data.changes.map((change) => ({
      teamId: data.teamId,
      connectorId: data.connectorId,
      documentId: change.documentId,
      changeType: change.changeType,
      source: change.source ?? "CONNECTOR_SYNC",
      changedBy: change.changedBy,
      changedFields: change.changedFields ?? [],
      metadata: change.metadata ?? {},
      eventTime: change.eventTime,
    })),
  });
}

export function createEntityChange(
  db: Database,
  data: {
    teamId: string;
    entityId: string;
    field: string;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    source: ChangeSource;
    triggeredBy?: string;
  }
) {
  return db.entityChange.create({
    data: {
      teamId: data.teamId,
      entityId: data.entityId,
      field: data.field,
      oldValue: data.oldValue,
      newValue: data.newValue,
      source: data.source,
      triggeredBy: data.triggeredBy,
    },
  });
}

export function createActivityEvent(
  db: Database,
  data: {
    teamId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return db.activityEvent.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      metadata: data.metadata ?? {},
    },
  });
}

export function markChangesProcessed(db: Database, changeIds: string[]) {
  return db.documentChange.updateMany({
    where: { id: { in: changeIds } },
    data: { processedAt: new Date() },
  });
}

export function createUserInteraction(
  db: Database,
  data: {
    teamId: string;
    userId: string;
    documentId: string;
    action: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return db.userInteraction.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      documentId: data.documentId,
      action: data.action,
      metadata: data.metadata ?? {},
    },
  });
}

export function upsertUserEntityAffinity(
  db: Database,
  data: {
    teamId: string;
    userId: string;
    entityId: string;
    scoreDelta: number;
    source: string;
  }
) {
  return db.userEntityAffinity.upsert({
    where: {
      teamId_userId_entityId: {
        teamId: data.teamId,
        userId: data.userId,
        entityId: data.entityId,
      },
    },
    create: {
      teamId: data.teamId,
      userId: data.userId,
      entityId: data.entityId,
      score: data.scoreDelta,
      source: data.source,
    },
    update: {
      score: { increment: data.scoreDelta },
      source: data.source,
    },
  });
}
