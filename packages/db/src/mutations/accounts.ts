import type { Database } from "..";

export interface UpsertAccountInput {
  providerId: string;
  accountId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scope?: string | null;
}

export const upsertAccount = async (
  db: Database,
  data: UpsertAccountInput
): Promise<{ id: string }> => {
  const account = await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: data.providerId,
        accountId: data.accountId,
      },
    },
    create: {
      providerId: data.providerId,
      accountId: data.accountId,
      userId: data.userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      idToken: data.idToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
      scope: data.scope,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? undefined,
      idToken: data.idToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
      scope: data.scope,
    },
    select: { id: true },
  });

  return account;
};

export const deleteAccountsByUserId = async (
  db: Database,
  userId: string
): Promise<number> => {
  const result = await db.account.deleteMany({ where: { userId } });
  return result.count;
};
