import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const workflowIdSchema = z.object({
  workflowId: z.string(),
});

function throwNotImplemented(): never {
  throw new TRPCError({
    code: "METHOD_NOT_SUPPORTED",
    message: "Research endpoints are not yet implemented",
  });
}

export const researchRouter = createTRPCRouter({
  start: withActiveTeam
    .input(
      z.object({
        prompt: z.string().min(1).max(10_000),
        options: z
          .object({
            maxSteps: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async () => throwNotImplemented()),

  progress: withActiveTeam
    .input(workflowIdSchema)
    .query(async () => throwNotImplemented()),

  artifacts: withActiveTeam
    .input(workflowIdSchema)
    .query(async () => throwNotImplemented()),

  cancel: withActiveTeam
    .input(workflowIdSchema)
    .mutation(async () => throwNotImplemented()),
});
