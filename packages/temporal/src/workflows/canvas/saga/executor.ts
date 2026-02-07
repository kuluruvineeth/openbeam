import type {
  CompletedSagaStep,
  SagaConfig,
  SagaExecutionResult,
  SagaExecutionState,
  SagaStepDefinition,
} from "./types";

export class SagaExecutor {
  private readonly state: SagaExecutionState;
  private readonly config: SagaConfig;
  private readonly clock: () => number;

  constructor(config: SagaConfig = {}) {
    this.clock = config.clock ?? (() => Date.now());
    this.state = {
      completedSteps: [],
      status: "pending",
      startedAt: this.clock(),
      rolledBack: false,
    };
    this.config = config;
  }

  getState(): SagaExecutionState {
    return { ...this.state, completedSteps: [...this.state.completedSteps] };
  }

  async execute<TInput, TOutput>(
    step: SagaStepDefinition<TInput, TOutput>,
    input: TInput
  ): Promise<TOutput> {
    if (this.state.status === "failed" || this.state.status === "rolled_back") {
      throw new Error(
        `Cannot execute step "${step.name}" - saga is in ${this.state.status} state`
      );
    }

    this.state.status = "running";
    const startedAt = this.clock();

    const output = await step.execute(input);
    const completedAt = this.clock();

    const completedStep: CompletedSagaStep<TInput, TOutput> = {
      name: step.name,
      input,
      output,
      executedAt: startedAt,
      latencyMs: completedAt - startedAt,
    };

    this.state.completedSteps.push(completedStep as CompletedSagaStep);

    if (this.config.onStepComplete) {
      await this.config.onStepComplete(completedStep as CompletedSagaStep);
    }

    return output;
  }

  async rollback(): Promise<void> {
    if (this.state.completedSteps.length === 0) {
      this.state.status = "rolled_back";
      this.state.rolledBack = true;
      return;
    }

    this.state.status = "rolling_back";

    if (this.config.onRollbackStart) {
      await this.config.onRollbackStart([...this.state.completedSteps]);
    }

    const stepsToRollback = [...this.state.completedSteps].reverse();
    let rollbackSuccess = true;

    for (const step of stepsToRollback) {
      const result = await this.executeCompensation(step);
      if (!result) {
        rollbackSuccess = false;
      }
    }

    this.state.status = "rolled_back";
    this.state.rolledBack = true;
    this.state.completedAt = this.clock();

    if (this.config.onRollbackComplete) {
      await this.config.onRollbackComplete(stepsToRollback, rollbackSuccess);
    }
  }

  private async executeCompensation(step: CompletedSagaStep): Promise<boolean> {
    const stepDef = this.findStepDefinition(step.name);
    if (!stepDef) {
      return false;
    }

    try {
      await stepDef.compensate(step.input, step.output);
      return true;
    } catch (error) {
      if (this.config.onStepError) {
        await this.config.onStepError(`compensate:${step.name}`, error);
      }
      return false;
    }
  }

  private readonly stepDefinitions = new Map<
    string,
    SagaStepDefinition<unknown, unknown>
  >();

  registerStep<TInput, TOutput>(
    step: SagaStepDefinition<TInput, TOutput>
  ): void {
    this.stepDefinitions.set(
      step.name,
      step as SagaStepDefinition<unknown, unknown>
    );
  }

  private findStepDefinition(
    name: string
  ): SagaStepDefinition<unknown, unknown> | undefined {
    return this.stepDefinitions.get(name);
  }

  complete<T>(output: T): SagaExecutionResult<T> {
    this.state.status = "completed";
    this.state.completedAt = this.clock();

    return {
      success: true,
      output,
      state: this.getState(),
    };
  }

  fail(error: string): SagaExecutionResult<never> {
    this.state.status = "failed";
    this.state.error = error;
    this.state.completedAt = this.clock();

    return {
      success: false,
      error,
      state: this.getState(),
    };
  }
}

export function createSagaExecutor(config: SagaConfig = {}): SagaExecutor {
  return new SagaExecutor(config);
}

export async function executeSaga<T>(
  executor: SagaExecutor,
  operation: () => Promise<T>
): Promise<SagaExecutionResult<T>> {
  try {
    const result = await operation();
    return executor.complete(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await executor.rollback();
    return executor.fail(errorMessage);
  }
}

export interface SagaStepBuilder<TContext> {
  addStep<TInput, TOutput>(
    name: string,
    execute: (input: TInput, context: TContext) => Promise<TOutput>,
    compensate: (
      input: TInput,
      output: TOutput,
      context: TContext
    ) => Promise<void>
  ): SagaStepBuilder<TContext>;
  build(): SagaExecutor;
}

export function createSagaBuilder<TContext>(
  context: TContext,
  config: SagaConfig = {}
): SagaStepBuilder<TContext> {
  const executor = new SagaExecutor(config);

  return {
    addStep<TInput, TOutput>(
      name: string,
      execute: (input: TInput, ctx: TContext) => Promise<TOutput>,
      compensate: (
        input: TInput,
        output: TOutput,
        ctx: TContext
      ) => Promise<void>
    ): SagaStepBuilder<TContext> {
      const step: SagaStepDefinition<TInput, TOutput> = {
        name,
        execute: (input) => execute(input, context),
        compensate: (input, output) => compensate(input, output, context),
      };
      executor.registerStep(step);
      return this;
    },
    build(): SagaExecutor {
      return executor;
    },
  };
}

export type { SagaExecutionResult, SagaExecutionState, SagaConfig };
