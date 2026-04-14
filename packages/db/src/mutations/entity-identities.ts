import type { Database } from "../index";

interface UpsertEntityIdentityInput {
  entityId: string;
  teamId: string;
  connectorType: string;
  externalId: string;
  email?: string;
  displayName?: string;
}

export function upsertEntityIdentity(
  db: Database,
  input: UpsertEntityIdentityInput
) {
  return db.entityIdentity.upsert({
    where: {
      teamId_connectorType_externalId: {
        teamId: input.teamId,
        connectorType: input.connectorType,
        externalId: input.externalId,
      },
    },
    update: {
      entityId: input.entityId,
      email: input.email,
      displayName: input.displayName,
    },
    create: input,
  });
}

export function deleteEntityIdentity(db: Database, id: string) {
  return db.entityIdentity.delete({ where: { id } });
}

export function moveEntityIdentities(
  db: Database,
  fromEntityId: string,
  toEntityId: string
) {
  return db.entityIdentity.updateMany({
    where: { entityId: fromEntityId },
    data: { entityId: toEntityId },
  });
}
