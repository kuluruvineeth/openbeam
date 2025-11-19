import { auth } from "@openplane/auth";
import { connectDb, type Database } from "@openplane/db";
import type { Context as HonoContext } from "hono";

// Define the session structure including organization plugin fields
type SessionWithOrg = Awaited<ReturnType<typeof auth.api.getSession>> & {
  session: {
    activeOrganizationId?: string | null;
  };
};

export type TRPCContext = {
  session: SessionWithOrg;
  prisma: Database;
};

export async function createTRPCContext({
  context,
}: {
  context: HonoContext;
}): Promise<TRPCContext> {
  // Get the current user session from Better Auth using Hono's request headers
  const session = (await auth.api.getSession({
    headers: context.req.raw.headers,
  })) as SessionWithOrg;

  // For now, use the shared Prisma client from @openplane/db
  const prisma = await connectDb();

  return {
    session,
    prisma,
  };
}
