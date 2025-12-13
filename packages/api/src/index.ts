import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "./context";

export const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  sse: {
    ping: {
      enabled: true,
      intervalMs: 3000,
    },
    client: {
      reconnectAfterInactivityMs: 5000,
    },
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

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
const _protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const protectedProcedure: typeof _protectedProcedure =
  _protectedProcedure;
