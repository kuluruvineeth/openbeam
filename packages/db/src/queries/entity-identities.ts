import type { Database } from "../index";

export function getEntityIdentities(db: Database, entityId: string) {
  return db.entityIdentity.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
  });
}

export function getIdentityByEmail(
  db: Database,
  teamId: string,
  email: string
) {
  return db.entityIdentity.findFirst({
    where: { teamId, email },
    include: { entity: true },
  });
}

export function getIdentityByExternalId(
  db: Database,
  teamId: string,
  connectorType: string,
  externalId: string
) {
  return db.entityIdentity.findUnique({
    where: {
      teamId_connectorType_externalId: { teamId, connectorType, externalId },
    },
    include: { entity: true },
  });
}

export function getEntitiesWithoutIdentities(
  db: Database,
  teamId: string,
  limit = 100
) {
  return db.entity.findMany({
    where: {
      teamId,
      type: "PERSON",
      identities: { none: {} },
    },
    orderBy: { mentionCount: "desc" },
    take: limit,
  });
}
