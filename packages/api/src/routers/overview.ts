import {
  getAgentOverviewOrchestrator,
  type OverviewRequest,
} from "@openplane/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

function buildAccessControlIds(ctx: {
  teamId: string;
  session: { user: { id: string; email?: string | null } };
}): string[] {
  return [
    `team:${ctx.teamId}`,
    ctx.session.user.id,
    ctx.session.user.email,
  ].filter(Boolean) as string[];
}

const overviewInputSchema = z.object({
  query: z.string().min(1).max(2000),
  maxSources: z.number().min(1).max(20).optional(),
  enableFanout: z.boolean().optional(),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const overviewRouter = createTRPCRouter({
  stream: withActiveTeam
    .input(overviewInputSchema)
    .subscription(async function* ({ ctx, input }) {
      const accessControlIds = buildAccessControlIds(ctx);
      const orchestrator = getAgentOverviewOrchestrator();

      const request: OverviewRequest = {
        query: input.query,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        accessControlIds,
        maxSources: input.maxSources ?? 8,
        enableFanout: input.enableFanout ?? true,
        modelId: input.modelId,
        temperature: input.temperature,
      };

      for await (const chunk of orchestrator.stream(request)) {
        yield chunk;
      }
    }),
});
