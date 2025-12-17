import type { Database } from "..";

export interface CreateSessionInput {
  token: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionResult {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
}

export const createSession = async (
  db: Database,
  data: CreateSessionInput
): Promise<CreateSessionResult> => {
  const session = await db.session.create({
    data: {
      token: data.token,
      userId: data.userId,
      expiresAt: data.expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
    select: {
      id: true,
      token: true,
      userId: true,
      expiresAt: true,
    },
  });

  return session;
};

export const deleteSessionByToken = async (
  db: Database,
  token: string
): Promise<void> => {
  await db.session.deleteMany({ where: { token } });
};

export const deleteSessionById = async (
  db: Database,
  id: string
): Promise<void> => {
  await db.session.delete({ where: { id } });
};

export const deleteSessionsByUserId = async (
  db: Database,
  userId: string
): Promise<number> => {
  const result = await db.session.deleteMany({ where: { userId } });
  return result.count;
};

export const deleteExpiredSessions = async (db: Database): Promise<number> => {
  const result = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
};
