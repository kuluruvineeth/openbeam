import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "./context";

// Initialize tRPC with our shared Context (session + prisma) and SuperJSON transformer
export const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

// Base router and caller factory (useful for server-side callers later)
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Public procedures: no auth required
export const publicProcedure = t.procedure;

// For protected procedures we want `ctx.session` to be non-null.
// We model this with a refined context type.
type AuthedContext = TRPCContext & {
  session: NonNullable<TRPCContext["session"]>;
};

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }

  return next({
    ctx: ctx as AuthedContext,
  });
});
// Protected procedures: require an authenticated session and expose non-null session in ctx.
const _protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const protectedProcedure: typeof _protectedProcedure =
  _protectedProcedure;

// Exports
export * from "./integrations/types";
export * from "./slack/use-cases/oauth";
