import { type Database, findSessionById } from "@openbeam/db";
import { TRPCError } from "@trpc/server";

type SessionOwnership = {
  db: Database;
  sessionId: string;
  teamId: string;
  userId: string;
};

export async function verifySessionOwnership({
  db,
  sessionId,
  teamId,
  userId,
}: SessionOwnership) {
  const session = await findSessionById(db, sessionId, teamId);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  if (session.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Session access denied",
    });
  }

  return session;
}
