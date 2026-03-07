import type { Database } from "@openbeam/db";
import type { ExecutionStatus } from "@openbeam/types/canvas";
import { z } from "zod";

export interface CompensationDependencies {
  db: Database;
}

const DeleteCanvasExecutionStepInputSchema = z.object({
  stepId: z.string(),
  teamId: z.string(),
});

type DeleteCanvasExecutionStepInput = z.infer<
  typeof DeleteCanvasExecutionStepInputSchema
>;

const RevertCanvasExecutionStatusInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  status: z.string(),
  currentNodeId: z.string().nullable().optional(),
});

type RevertCanvasExecutionStatusInput = z.infer<
  typeof RevertCanvasExecutionStatusInputSchema
>;

const ClearStoredOutputInputSchema = z.object({
  executionId: z.string(),
  teamId: z.string(),
  dataId: z.string(),
});

type ClearStoredOutputInput = z.infer<typeof ClearStoredOutputInputSchema>;

export function createDeleteCanvasExecutionStepActivity(
  deps: CompensationDependencies
) {
  return async function deleteCanvasExecutionStep(
    rawInput: unknown
  ): Promise<void> {
    const input = DeleteCanvasExecutionStepInputSchema.parse(rawInput);

    await deps.db.$transaction(async (tx) => {
      const step = await tx.agentCanvasExecutionStep.findFirst({
        where: {
          id: input.stepId,
          execution: {
            agentCanvas: { teamId: input.teamId },
          },
        },
        select: { id: true },
      });

      if (!step) {
        return;
      }

      await tx.agentCanvasExecutionStep.delete({
        where: { id: step.id },
      });
    });
  };
}

export function createRevertCanvasExecutionStatusActivity(
  deps: CompensationDependencies
) {
  return async function revertCanvasExecutionStatus(
    rawInput: unknown
  ): Promise<void> {
    const input = RevertCanvasExecutionStatusInputSchema.parse(rawInput);

    await deps.db.$transaction(async (tx) => {
      const execution = await tx.agentCanvasExecution.findFirst({
        where: {
          id: input.executionId,
          agentCanvas: { teamId: input.teamId },
        },
        select: { id: true },
      });

      if (!execution) {
        return;
      }

      await tx.agentCanvasExecution.update({
        where: { id: execution.id },
        data: {
          status: input.status as ExecutionStatus,
          currentNodeId: input.currentNodeId,
        },
      });
    });
  };
}

export function createClearStoredOutputActivity(
  deps: CompensationDependencies
) {
  return async function clearStoredOutput(rawInput: unknown): Promise<void> {
    const input = ClearStoredOutputInputSchema.parse(rawInput);

    await deps.db.$transaction(async (tx) => {
      const data = await tx.agentCanvasExecutionData.findFirst({
        where: {
          id: input.dataId,
          executionId: input.executionId,
          execution: {
            agentCanvas: { teamId: input.teamId },
          },
        },
        select: { id: true },
      });

      if (!data) {
        return;
      }

      await tx.agentCanvasExecutionData.delete({
        where: { id: data.id },
      });
    });
  };
}

export interface CompensationActivities {
  deleteCanvasExecutionStep(
    input: DeleteCanvasExecutionStepInput
  ): Promise<void>;
  revertCanvasExecutionStatus(
    input: RevertCanvasExecutionStatusInput
  ): Promise<void>;
  clearStoredOutput(input: ClearStoredOutputInput): Promise<void>;
}

export function createCompensationActivities(
  deps: CompensationDependencies
): CompensationActivities {
  return {
    deleteCanvasExecutionStep: createDeleteCanvasExecutionStepActivity(deps),
    revertCanvasExecutionStatus:
      createRevertCanvasExecutionStatusActivity(deps),
    clearStoredOutput: createClearStoredOutputActivity(deps),
  };
}

export type {
  ClearStoredOutputInput,
  DeleteCanvasExecutionStepInput,
  RevertCanvasExecutionStatusInput,
};
