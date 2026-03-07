import {
  findControlHeartbeatRunById,
  listControlHeartbeatRunEvents,
  listControlHeartbeatRuns,
} from "@openbeam/db";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";

export const heartbeatsRouter = createTRPCRouter({
  listRuns: withActiveTeam
    .input(
      z.object({
        agentId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(({ ctx, input }) =>
      listControlHeartbeatRuns(ctx.prisma, ctx.teamId, input.agentId ?? "", {
        status: input.status as never,
        limit: input.limit,
        offset: input.offset,
      })
    ),

  getRun: withActiveTeam
    .input(z.object({ runId: z.string().min(1) }))
    .query(({ ctx, input }) =>
      findControlHeartbeatRunById(ctx.prisma, input.runId, ctx.teamId)
    ),

  getRunEvents: withActiveTeam
    .input(
      z.object({
        runId: z.string().min(1),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(({ ctx, input }) =>
      listControlHeartbeatRunEvents(ctx.prisma, input.runId, {
        limit: input.limit,
        afterSeq: input.offset,
      })
    ),
});
