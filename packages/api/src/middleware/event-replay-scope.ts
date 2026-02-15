import {
  type Database,
  listSessionEvents,
  listSessionEventsAfterSequence,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { verifySessionOwnership } from "./session-auth";

type ReplayScope = {
  db: Database;
  sessionId: string;
  teamId: string;
  userId: string;
};

type ReplayOptions = {
  limit?: number;
  cursorSequence?: number;
};

type ReplayAfterOptions = {
  afterSequence: number;
  limit?: number;
};

export async function replaySessionEvents(
  scope: ReplayScope,
  options: ReplayOptions = {}
) {
  await verifySessionOwnership(scope);

  return listSessionEvents(scope.db, scope.sessionId, {
    limit: options.limit,
    cursorSequence: options.cursorSequence,
  });
}

export async function replaySessionEventsAfterSequence(
  scope: ReplayScope,
  options: ReplayAfterOptions
) {
  await verifySessionOwnership(scope);

  return listSessionEventsAfterSequence(
    scope.db,
    scope.sessionId,
    options.afterSequence,
    options.limit
  );
}

export async function verifyScopedSubscription(scope: ReplayScope) {
  const session = await verifySessionOwnership(scope);

  if (session.status !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Session is archived",
    });
  }

  return session;
}
