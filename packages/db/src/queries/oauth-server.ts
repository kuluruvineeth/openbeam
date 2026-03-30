import type { Database } from "../index";

export async function findOAuthAppByClientId(db: Database, clientId: string) {
  return await db.oAuthApplication.findUnique({
    where: { clientId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      website: true,
      redirectUris: true,
      clientId: true,
      clientSecret: true,
      scopes: true,
      teamId: true,
      createdBy: true,
      isPublic: true,
      active: true,
      status: true,
    },
  });
}

export async function findOAuthAppById(db: Database, id: string) {
  return await db.oAuthApplication.findUnique({
    where: { id },
  });
}

export async function listOAuthAppsByTeam(db: Database, teamId: string) {
  return await db.oAuthApplication.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      clientId: true,
      scopes: true,
      isPublic: true,
      active: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function findAuthorizationCode(db: Database, code: string) {
  return await db.oAuthAuthorizationCode.findUnique({
    where: { code },
    include: {
      application: {
        select: {
          id: true,
          clientId: true,
          clientSecret: true,
          isPublic: true,
          active: true,
          status: true,
          teamId: true,
          scopes: true,
        },
      },
    },
  });
}

export async function validateOAuthAccessToken(
  db: Database,
  tokenHash: string
) {
  const token = await db.oAuthAccessToken.findUnique({
    where: { tokenHash },
    include: {
      application: {
        select: { id: true, clientId: true, active: true, name: true },
      },
    },
  });

  if (!token) {
    return null;
  }
  if (token.revoked) {
    return null;
  }
  if (token.expiresAt < new Date()) {
    return null;
  }
  if (!token.application.active) {
    return null;
  }

  return token;
}

export async function getOAuthAppInfo(db: Database, clientId: string) {
  return await db.oAuthApplication.findUnique({
    where: { clientId },
    select: {
      id: true,
      name: true,
      description: true,
      overview: true,
      developerName: true,
      logoUrl: true,
      website: true,
      scopes: true,
      isPublic: true,
      status: true,
    },
  });
}

export async function listAuthorizedApps(db: Database, userId: string) {
  const tokens = await db.oAuthAccessToken.findMany({
    where: { userId, revoked: false },
    select: {
      applicationId: true,
      scopes: true,
      createdAt: true,
      application: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          description: true,
          developerName: true,
        },
      },
    },
    distinct: ["applicationId"],
    orderBy: { createdAt: "desc" },
  });

  return tokens.map((t) => ({
    ...t.application,
    authorizedScopes: t.scopes,
    authorizedAt: t.createdAt,
  }));
}
