import type { Database } from "..";

export interface SessionWithUser {
  id: string;
  token: string;
  expiresAt: Date;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
    teamId: string | null;
  };
}

export const getSessionByToken = async (
  db: Database,
  token: string
): Promise<SessionWithUser | null> => {
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          teamId: true,
        },
      },
    },
  });

  return session;
};

export const getSessionsByUserId = async (
  db: Database,
  userId: string
): Promise<Array<{ id: string; expiresAt: Date; createdAt: Date }>> =>
  db.session.findMany({
    where: { userId },
    select: {
      id: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
