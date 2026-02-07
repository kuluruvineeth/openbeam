import type { ExecutionStatus } from "@openplane/types/canvas";
import type {
  CanvasCompensationContext,
  CreateStepCompensation,
  SagaStepDefinition,
  StoreOutputCompensation,
  UpdateExecutionCompensation,
} from "./types";

type CompensationHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  output: TOutput,
  context: CanvasCompensationContext
) => Promise<void> | never;

interface CompensationEntry<TInput = unknown, TOutput = unknown> {
  handler: CompensationHandler<TInput, TOutput>;
  description: string;
}

const compensationHandlers = new Map<string, CompensationEntry>();

export function registerCompensationHandler<TInput, TOutput>(
  name: string,
  handler: CompensationHandler<TInput, TOutput>,
  description: string
): void {
  compensationHandlers.set(name, {
    handler: handler as CompensationHandler,
    description,
  });
}

export function getCompensationHandler(
  name: string
): CompensationEntry | undefined {
  return compensationHandlers.get(name);
}

export function hasCompensationHandler(name: string): boolean {
  return compensationHandlers.has(name);
}

export function listCompensationHandlers(): Array<{
  name: string;
  description: string;
}> {
  return Array.from(compensationHandlers.entries()).map(
    ([name, { description }]) => ({
      name,
      description,
    })
  );
}

export interface CompensationActivities {
  deleteCanvasExecutionStep(input: {
    stepId: string;
    teamId: string;
  }): Promise<void>;
  revertCanvasExecutionStatus(input: {
    executionId: string;
    teamId: string;
    status: ExecutionStatus;
    currentNodeId?: string | null;
  }): Promise<void>;
  clearStoredOutput(input: {
    executionId: string;
    teamId: string;
    dataId: string;
  }): Promise<void>;
}

export function createCompensationHandlers(
  activities: CompensationActivities,
  context: CanvasCompensationContext
) {
  return {
    async compensateCreateStep(
      _input: unknown,
      output: CreateStepCompensation
    ): Promise<void> {
      await activities.deleteCanvasExecutionStep({
        stepId: output.stepId,
        teamId: context.teamId,
      });
    },

    async compensateUpdateExecution(
      _input: unknown,
      output: UpdateExecutionCompensation
    ): Promise<void> {
      await activities.revertCanvasExecutionStatus({
        executionId: output.executionId,
        teamId: context.teamId,
        status: output.previousStatus,
        currentNodeId: output.previousNodeId,
      });
    },

    async compensateStoreOutput(
      _input: unknown,
      output: StoreOutputCompensation
    ): Promise<void> {
      if (output.dataId) {
        await activities.clearStoredOutput({
          executionId: output.executionId,
          teamId: context.teamId,
          dataId: output.dataId,
        });
      }
    },
  };
}

export function createSagaStep<TInput, TOutput>(
  definition: SagaStepDefinition<TInput, TOutput>
): SagaStepDefinition<TInput, TOutput> {
  return definition;
}

registerCompensationHandler<unknown, CreateStepCompensation>(
  "createCanvasExecutionStep",
  (_input, output, _context) => {
    throw new Error(
      `Compensation for createCanvasExecutionStep requires activity context. Step ID: ${output.stepId}`
    );
  },
  "Deletes a canvas execution step that was created during the saga"
);

registerCompensationHandler<unknown, UpdateExecutionCompensation>(
  "updateCanvasExecution",
  (_input, output, _context) => {
    throw new Error(
      `Compensation for updateCanvasExecution requires activity context. Execution ID: ${output.executionId}`
    );
  },
  "Reverts canvas execution status to its previous state"
);

registerCompensationHandler<unknown, StoreOutputCompensation>(
  "storeParallelMapOutput",
  (_input, output, _context) => {
    throw new Error(
      `Compensation for storeParallelMapOutput requires activity context. Data ID: ${output.dataId}`
    );
  },
  "Clears stored parallel map output data"
);

export type CanvasCompensationHandlers = ReturnType<
  typeof createCompensationHandlers
>;
