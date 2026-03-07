import {
  type AuthSession,
  getSessionFromHeaders,
  validateSession,
} from "@openbeam/auth";
import { connectDb, type Database } from "@openbeam/db";
import type { Context as HonoContext } from "hono";

export type TRPCContext = {
  session: AuthSession | null;
  prisma: Database;
};

export async function createTRPCContext({
  context,
}: {
  context: HonoContext;
}): Promise<TRPCContext> {
  const prisma = await connectDb();

  const token = getSessionFromHeaders(context.req.raw.headers);
  let session: AuthSession | null = null;

  if (token) {
    session = await validateSession(prisma, token);
  }

  return {
    session,
    prisma,
  };
}
