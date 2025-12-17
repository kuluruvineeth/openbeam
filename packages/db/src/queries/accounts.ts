import type { Database } from "..";

export interface AccountInfo {
  id: string;
  providerId: string;
  accountId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}

export const getAccountByProvider = async (
  db: Database,
  providerId: string,
  accountId: string
): Promise<AccountInfo | null> =>
  db.account.findUnique({
    where: {
      providerId_accountId: { providerId, accountId },
    },
    select: {
      id: true,
      providerId: true,
      accountId: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
    },
  });

export const getAccountsByUserId = async (
  db: Database,
  userId: string
): Promise<Array<{ id: string; providerId: string; accountId: string }>> =>
  db.account.findMany({
    where: { userId },
    select: {
      id: true,
      providerId: true,
      accountId: true,
    },
  });
