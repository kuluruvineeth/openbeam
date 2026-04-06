import { createHash } from "node:crypto";
import type { Database } from "../../index";

export type StoredAuthCode = {
  id: string;
  code: string;
  applicationId: string;
  userId: string;
  teamId: string;
  scopes: string[];
  redirectUri: string;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

export type StoredApplication = {
  id: string;
  clientId: string;
  clientSecret: string | null;
  isPublic: boolean;
  active: boolean;
};

export type StoredAccessToken = {
  id: string;
  tokenHash: string;
  refreshTokenHash: string;
  applicationId: string;
  userId: string;
  teamId: string;
  scopes: string[];
  expiresAt: Date;
  refreshTokenExpiresAt: Date | null;
  revoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
};

export type StoreOptions = {
  application?: Partial<StoredApplication>;
  authCode?: Partial<StoredAuthCode> | null;
  accessToken?: Partial<StoredAccessToken> | null;
};

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function pkcePair(verifier: string): {
  verifier: string;
  challenge: string;
} {
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function baseApplication(
  overrides: Partial<StoredApplication> = {}
): StoredApplication {
  return {
    id: "app_1",
    clientId: "op_client_test",
    clientSecret: null,
    isPublic: true,
    active: true,
    ...overrides,
  };
}

function baseAuthCode(overrides: Partial<StoredAuthCode> = {}): StoredAuthCode {
  const createdAt = new Date();
  return {
    id: "code_1",
    code: "op_auth_code_test",
    applicationId: "app_1",
    userId: "user_1",
    teamId: "team_1",
    scopes: ["search:read", "connectors:read"],
    redirectUri: "http://localhost:54321/callback",
    codeChallenge: null,
    codeChallengeMethod: null,
    expiresAt: new Date(createdAt.getTime() + 5 * 60_000),
    used: false,
    createdAt,
    ...overrides,
  };
}

function baseAccessToken(
  overrides: Partial<StoredAccessToken> = {}
): StoredAccessToken {
  const createdAt = new Date();
  return {
    id: "token_1",
    tokenHash: "hash",
    refreshTokenHash: "refresh_hash",
    applicationId: "app_1",
    userId: "user_1",
    teamId: "team_1",
    scopes: ["search:read", "connectors:read"],
    expiresAt: new Date(createdAt.getTime() + 7_200_000),
    refreshTokenExpiresAt: new Date(createdAt.getTime() + 2_592_000_000),
    revoked: false,
    revokedAt: null,
    createdAt,
    ...overrides,
  };
}

export function createDbStub(options: StoreOptions = {}): {
  db: Database;
  tokens: StoredAccessToken[];
  authCodes: StoredAuthCode[];
  applications: Map<string, StoredApplication>;
} {
  const application = options.application
    ? baseApplication(options.application)
    : baseApplication();
  const tokens: StoredAccessToken[] = options.accessToken
    ? [
        baseAccessToken({
          applicationId: application.id,
          ...options.accessToken,
        }),
      ]
    : [];
  const authCodes: StoredAuthCode[] =
    options.authCode === null
      ? []
      : [baseAuthCode({ applicationId: application.id, ...options.authCode })];
  const applications = new Map<string, StoredApplication>([
    [application.clientId, application],
    [application.id, application],
  ]);

  const db = {
    oAuthApplication: {
      findUnique: (args: {
        where: { slug?: string; clientId?: string; id?: string };
      }) => {
        if (args.where.slug) {
          return Promise.resolve(null);
        }
        if (args.where.clientId) {
          return Promise.resolve(applications.get(args.where.clientId) ?? null);
        }
        if (args.where.id) {
          return Promise.resolve(applications.get(args.where.id) ?? null);
        }
        return Promise.resolve(null);
      },
      create: (args: {
        data: {
          name: string;
          slug: string;
          clientId: string;
          redirectUris: string[];
          scopes: string[];
          isPublic: boolean;
          active: boolean;
          status: string;
        };
      }) => {
        const created: StoredApplication = {
          id: `app_${applications.size}`,
          clientId: args.data.clientId,
          clientSecret: null,
          isPublic: args.data.isPublic,
          active: args.data.active,
        };
        applications.set(created.clientId, created);
        applications.set(created.id, created);
        return Promise.resolve({ ...created, slug: args.data.slug });
      },
    },
    oAuthAuthorizationCode: {
      findUnique: (args: { where: { code: string }; include?: unknown }) => {
        const stored = authCodes.find((c) => c.code === args.where.code);
        if (!stored) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ ...stored, application });
      },
      create: (args: { data: StoredAuthCode }) => {
        authCodes.push({ ...args.data, id: `code_${authCodes.length + 1}` });
        return Promise.resolve(undefined);
      },
      update: (args: {
        where: { id: string };
        data: Partial<StoredAuthCode>;
      }) => {
        const idx = authCodes.findIndex((c) => c.id === args.where.id);
        if (idx >= 0) {
          const existing = authCodes[idx];
          if (existing) {
            authCodes[idx] = { ...existing, ...args.data };
          }
        }
        return Promise.resolve(undefined);
      },
    },
    oAuthAccessToken: {
      findUnique: (args: {
        where: { tokenHash?: string; refreshTokenHash?: string };
      }) => {
        const token = tokens.find(
          (t) =>
            (args.where.tokenHash && t.tokenHash === args.where.tokenHash) ||
            (args.where.refreshTokenHash &&
              t.refreshTokenHash === args.where.refreshTokenHash)
        );
        if (!token) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ ...token, application });
      },
      create: (args: { data: Omit<StoredAccessToken, "id" | "createdAt"> }) => {
        tokens.push({
          ...args.data,
          id: `token_${tokens.length + 1}`,
          createdAt: new Date(),
          revoked: args.data.revoked ?? false,
          revokedAt: args.data.revokedAt ?? null,
        });
        return Promise.resolve(undefined);
      },
      update: (args: {
        where: { id: string };
        data: Partial<StoredAccessToken>;
      }) => {
        const idx = tokens.findIndex((t) => t.id === args.where.id);
        if (idx >= 0) {
          const existing = tokens[idx];
          if (existing) {
            tokens[idx] = { ...existing, ...args.data };
          }
        }
        return Promise.resolve(undefined);
      },
      updateMany: (args: {
        where: {
          tokenHash?: string;
          refreshTokenHash?: string;
          revoked?: boolean;
          applicationId?: string;
          userId?: string;
          createdAt?: { gte: Date; lte: Date };
        };
        data: Partial<StoredAccessToken>;
      }) => {
        let count = 0;
        for (let i = 0; i < tokens.length; i += 1) {
          const token = tokens[i];
          if (!token) {
            continue;
          }
          if (
            args.where.tokenHash &&
            token.tokenHash !== args.where.tokenHash
          ) {
            continue;
          }
          if (
            args.where.refreshTokenHash &&
            token.refreshTokenHash !== args.where.refreshTokenHash
          ) {
            continue;
          }
          if (
            args.where.revoked !== undefined &&
            token.revoked !== args.where.revoked
          ) {
            continue;
          }
          if (
            args.where.applicationId &&
            token.applicationId !== args.where.applicationId
          ) {
            continue;
          }
          if (args.where.userId && token.userId !== args.where.userId) {
            continue;
          }
          if (
            args.where.createdAt &&
            (token.createdAt < args.where.createdAt.gte ||
              token.createdAt > args.where.createdAt.lte)
          ) {
            continue;
          }
          tokens[i] = { ...token, ...args.data };
          count += 1;
        }
        return Promise.resolve({ count });
      },
    },
  } as unknown as Database;

  return { db, tokens, authCodes, applications };
}
