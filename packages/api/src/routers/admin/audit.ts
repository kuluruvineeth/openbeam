import { listAuditLogs } from "@openbeam/db";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withAdminRole } from "../apps/middleware";

export const adminAuditRouter = createTRPCRouter({
  list: withAdminRole
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        category: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) =>
      listAuditLogs(ctx.prisma, ctx.teamId, {
        cursor: input.cursor,
        limit: input.limit,
        category: input.category,
        userId: input.userId,
      })
    ),
});
