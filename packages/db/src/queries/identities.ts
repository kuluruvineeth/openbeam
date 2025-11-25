/**
 * External Identity Queries
 * Query functions for external identities synced from connectors
 */

import type { ExternalIdentity, User } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface ListIdentitiesOptions {
  search?: string;
  isBot?: boolean;
  isActive?: boolean;
  linked?: boolean;
  limit?: number;
  offset?: number;
}

export interface IdentityWithUser extends ExternalIdentity {
  user: Pick<User, "id" | "name" | "email" | "image"> | null;
}

export interface IdentityListResult {
  identities: IdentityWithUser[];
  total: number;
}

export interface IdentityStats {
  total: number;
  linked: number;
  unlinked: number;
  bots: number;
  active: number;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List external identities for a connector
 */
export const listIdentitiesByConnector = async (
  db: Database,
  connectorId: string,
  options: ListIdentitiesOptions = {}
): Promise<IdentityListResult> => {
  const { search, isBot, isActive, linked, limit = 50, offset = 0 } = options;

  const where = {
    connectorId,
    ...(search && {
      OR: [
        { displayName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { username: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(isBot !== undefined && { isBot }),
    ...(isActive !== undefined && { isActive }),
    ...(linked !== undefined && {
      userId: linked ? { not: null } : null,
    }),
  };

  const [identities, total] = await Promise.all([
    db.externalIdentity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { displayName: "asc" },
      take: limit,
      skip: offset,
    }),
    db.externalIdentity.count({ where }),
  ]);

  return {
    identities: identities as IdentityWithUser[],
    total,
  };
};

/**
 * Get identity by ID with connector team verification
 */
export const getIdentityById = async (
  db: Database,
  identityId: string,
  teamId: string
): Promise<IdentityWithUser | null> => {
  const identity = await db.externalIdentity.findUnique({
    where: { id: identityId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
      connector: {
        select: { teamId: true },
      },
    },
  });

  if (!identity || identity.connector.teamId !== teamId) {
    return null;
  }

  const { connector: _, ...rest } = identity;
  return rest as IdentityWithUser;
};

/**
 * Get identity stats for a connector
 */
export const getIdentityStats = async (
  db: Database,
  connectorId: string
): Promise<IdentityStats> => {
  const [total, linked, bots, active] = await Promise.all([
    db.externalIdentity.count({ where: { connectorId } }),
    db.externalIdentity.count({
      where: { connectorId, userId: { not: null } },
    }),
    db.externalIdentity.count({ where: { connectorId, isBot: true } }),
    db.externalIdentity.count({ where: { connectorId, isActive: true } }),
  ]);

  return { total, linked, unlinked: total - linked, bots, active };
};

/**
 * Find identity by external ID
 */
export const findIdentityByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<ExternalIdentity | null> =>
  db.externalIdentity.findUnique({
    where: {
      connectorId_externalId: { connectorId, externalId },
    },
  });
