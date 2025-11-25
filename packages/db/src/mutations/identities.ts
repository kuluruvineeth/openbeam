/**
 * External Identity Mutations
 * Mutation functions for external identities
 */

import type { ExternalIdentity, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface UpsertIdentityInput {
  connectorId: string;
  externalId: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  externalRole?: string;
  isBot?: boolean;
  isActive?: boolean;
  groupIds?: string[];
  metadata?: Prisma.InputJsonValue;
  rawData?: Prisma.InputJsonValue;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Link external identity to a user
 */
export const linkIdentityToUser = async (
  db: Database,
  identityId: string,
  userId: string
): Promise<ExternalIdentity> =>
  db.externalIdentity.update({
    where: { id: identityId },
    data: { userId },
  });

/**
 * Unlink external identity from user
 */
export const unlinkIdentity = async (
  db: Database,
  identityId: string
): Promise<ExternalIdentity> =>
  db.externalIdentity.update({
    where: { id: identityId },
    data: { userId: null },
  });

/**
 * Upsert external identity (create or update)
 */
export const upsertIdentity = async (
  db: Database,
  data: UpsertIdentityInput
): Promise<ExternalIdentity> => {
  const { connectorId, externalId, ...rest } = data;

  return db.externalIdentity.upsert({
    where: {
      connectorId_externalId: { connectorId, externalId },
    },
    create: {
      connectorId,
      externalId,
      ...rest,
    },
    update: rest,
  });
};

/**
 * Bulk upsert identities
 */
export const bulkUpsertIdentities = async (
  db: Database,
  identities: UpsertIdentityInput[]
): Promise<number> => {
  let count = 0;

  // Use transaction for atomicity
  await db.$transaction(async (tx) => {
    for (const identity of identities) {
      await tx.externalIdentity.upsert({
        where: {
          connectorId_externalId: {
            connectorId: identity.connectorId,
            externalId: identity.externalId,
          },
        },
        create: identity,
        update: identity,
      });
      count++;
    }
  });

  return count;
};

/**
 * Mark identities as inactive for a connector
 */
export const markIdentitiesInactive = async (
  db: Database,
  connectorId: string,
  externalIds: string[]
): Promise<number> => {
  const result = await db.externalIdentity.updateMany({
    where: {
      connectorId,
      externalId: { in: externalIds },
    },
    data: { isActive: false },
  });

  return result.count;
};

/**
 * Verify identity belongs to team's connector
 */
export const verifyIdentityTeamAccess = async (
  db: Database,
  identityId: string,
  teamId: string
): Promise<boolean> => {
  const identity = await db.externalIdentity.findUnique({
    where: { id: identityId },
    include: { connector: { select: { teamId: true } } },
  });

  return identity?.connector.teamId === teamId;
};

/**
 * Verify user is member of team
 */
export const verifyUserTeamMembership = async (
  db: Database,
  userId: string,
  teamId: string
): Promise<boolean> => {
  const membership = await db.usersOnTeam.findFirst({
    where: { userId, teamId },
  });

  return !!membership;
};
