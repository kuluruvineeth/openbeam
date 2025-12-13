import type { Database } from "../index";

export interface ApiKeyLookupResult {
  id: string;
  keyHash: string;
  teamId: string;
  scopes: string[];
}

export const findApiKeyByPrefix = async (
  db: Database,
  prefix: string
): Promise<ApiKeyLookupResult | null> =>
  db.apiKey.findFirst({
    where: {
      prefix,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      keyHash: true,
      teamId: true,
      scopes: true,
    },
  });

export const updateApiKeyLastUsed = async (
  db: Database,
  id: string
): Promise<void> => {
  await db.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
};
