import { CATALOG_AGENTS } from "@openbeam/computer";
import {
  approveComputerRun,
  createComputerAgent,
  createComputerRun,
  deleteComputerAgent,
  getAgentMemoryEntries,
  getComputerAgentById,
  getComputerAgentBySlug,
  getComputerAgents,
  getComputerRunProposals,
  getComputerRuns,
  getComputerRunWithSteps,
  rejectComputerRun,
  updateComputerAgent,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const agentIdSchema = z.object({ agentId: z.string() });

const runIdSchema = z.object({
  agentId: z.string(),
  runId: z.string(),
});

export const computerRouter = createTRPCRouter({
  listCatalog: withActiveTeam.query(() =>
    CATALOG_AGENTS.map((a) => ({
      templateId: a.templateId,
      name: a.name,
      slug: a.slug,
      description: a.description,
      scheduleCron: a.scheduleCron,
    }))
  ),

  listAgents: withActiveTeam.query(async ({ ctx }) =>
    getComputerAgents(ctx.prisma, ctx.teamId)
  ),

  getAgent: withActiveTeam
    .input(agentIdSchema)
    .query(async ({ ctx, input }) => {
      const agent = await getComputerAgentById(ctx.prisma, input.agentId);
      if (!agent || agent.teamId !== ctx.teamId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return agent;
    }),

  enableAgent: withActiveTeam
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = CATALOG_AGENTS.find(
        (a) => a.templateId === input.templateId
      );
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      const existing = await getComputerAgentBySlug(
        ctx.prisma,
        ctx.teamId,
        template.slug
      );
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Agent already enabled",
        });
      }

      return createComputerAgent(ctx.prisma, {
        teamId: ctx.teamId,
        name: template.name,
        slug: template.slug,
        description: template.description,
        source: "CATALOG",
        code: template.code,
        templateId: template.templateId,
        scheduleCron: template.scheduleCron,
        status: "ACTIVE",
        createdBy: ctx.session.user.id,
      });
    }),

  updateAgent: withActiveTeam
    .input(
      z.object({
        agentId: z.string(),
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
        mode: z.enum(["AUTONOMOUS", "APPROVAL", "REPORT_ONLY"]).optional(),
        scheduleCron: z.string().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { agentId, ...data } = input;
      return updateComputerAgent(ctx.prisma, agentId, ctx.teamId, data);
    }),

  deleteAgent: withActiveTeam
    .input(agentIdSchema)
    .mutation(async ({ ctx, input }) =>
      deleteComputerAgent(ctx.prisma, input.agentId, ctx.teamId)
    ),

  triggerRun: withActiveTeam
    .input(agentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const runId = crypto.randomUUID();
      await createComputerRun(ctx.prisma, {
        id: runId,
        agentId: input.agentId,
        teamId: ctx.teamId,
        triggeredBy: "MANUAL",
        triggeredByUser: ctx.session.user.id,
      });
      return { runId };
    }),

  listRuns: withActiveTeam
    .input(
      z.object({
        agentId: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) =>
      getComputerRuns(ctx.prisma, input.agentId, ctx.teamId, input.limit)
    ),

  getRun: withActiveTeam.input(runIdSchema).query(async ({ ctx, input }) => {
    const run = await getComputerRunWithSteps(
      ctx.prisma,
      input.runId,
      input.agentId,
      ctx.teamId
    );
    if (!run) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return run;
  }),

  approveRun: withActiveTeam
    .input(
      z.object({
        runId: z.string(),
        approvedIndices: z.array(z.number().int().min(0)).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approved = await approveComputerRun(
        ctx.prisma,
        input.runId,
        input.approvedIndices
      );
      if (!approved) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending proposals",
        });
      }
      return approved;
    }),

  rejectRun: withActiveTeam
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) =>
      rejectComputerRun(ctx.prisma, input.runId)
    ),

  getProposals: withActiveTeam
    .input(runIdSchema)
    .query(async ({ ctx, input }) =>
      getComputerRunProposals(
        ctx.prisma,
        input.runId,
        input.agentId,
        ctx.teamId
      )
    ),

  listMemory: withActiveTeam
    .input(agentIdSchema)
    .query(async ({ ctx, input }) =>
      getAgentMemoryEntries(ctx.prisma, input.agentId, ctx.teamId)
    ),
});
