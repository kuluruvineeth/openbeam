import { createAdminAuditLog, getConnectorsWithStats } from "@openbeam/db";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withAdminRole } from "../apps/middleware";

export const adminConnectorsRouter = createTRPCRouter({
  list: withAdminRole.query(({ ctx }) =>
    getConnectorsWithStats(ctx.prisma, ctx.teamId)
  ),

  triggerSync: withAdminRole
    .input(z.object({ connectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await createAdminAuditLog(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        action: "trigger_sync",
        category: "connector",
        target: input.connectorId,
      });

      return { triggered: true, connectorId: input.connectorId };
    }),
});
