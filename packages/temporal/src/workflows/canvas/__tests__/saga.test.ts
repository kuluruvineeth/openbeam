import { describe, expect, it } from "vitest";
import {
  createSagaBuilder,
  createSagaExecutor,
  createSagaStep,
  executeSaga,
  type SagaConfig,
  type SagaStepDefinition,
} from "../saga";

describe("SagaExecutor", () => {
  describe("execute", () => {
    it("executes a step and tracks it", async () => {
      const executor = createSagaExecutor();
      const step: SagaStepDefinition<string, number> = {
        name: "testStep",
        execute: (input) => Promise.resolve(input.length),
        compensate: () => Promise.resolve(),
      };
      executor.registerStep(step);

      const result = await executor.execute(step, "hello");

      expect(result).toBe(5);
      const state = executor.getState();
      expect(state.completedSteps).toHaveLength(1);
      expect(state.completedSteps[0]?.name).toBe("testStep");
      expect(state.completedSteps[0]?.input).toBe("hello");
      expect(state.completedSteps[0]?.output).toBe(5);
    });

    it("tracks multiple steps in order", async () => {
      const executor = createSagaExecutor();
      const step1: SagaStepDefinition<string, number> = {
        name: "step1",
        execute: (input) => Promise.resolve(input.length),
        compensate: () => Promise.resolve(),
      };
      const step2: SagaStepDefinition<number, string> = {
        name: "step2",
        execute: (input) => Promise.resolve(`Result: ${input}`),
        compensate: () => Promise.resolve(),
      };
      executor.registerStep(step1);
      executor.registerStep(step2);

      const r1 = await executor.execute(step1, "test");
      const r2 = await executor.execute(step2, r1);

      expect(r2).toBe("Result: 4");
      const state = executor.getState();
      expect(state.completedSteps).toHaveLength(2);
      expect(state.completedSteps[0]?.name).toBe("step1");
      expect(state.completedSteps[1]?.name).toBe("step2");
    });

    it("records latency for each step", async () => {
      const executor = createSagaExecutor();
      const step: SagaStepDefinition<void, void> = {
        name: "slowStep",
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        },
        compensate: () => Promise.resolve(),
      };
      executor.registerStep(step);

      await executor.execute(step, undefined);

      const state = executor.getState();
      expect(state.completedSteps[0]?.latencyMs).toBeGreaterThanOrEqual(50);
    });

    it("calls onStepComplete callback", async () => {
      let callCount = 0;
      let lastCall: unknown;
      const onStepComplete = (completedStep: unknown) => {
        callCount += 1;
        lastCall = completedStep;
      };
      const config: SagaConfig = { onStepComplete };
      const executor = createSagaExecutor(config);
      const step: SagaStepDefinition<string, number> = {
        name: "testStep",
        execute: (input) => Promise.resolve(input.length),
        compensate: () => Promise.resolve(),
      };
      executor.registerStep(step);

      await executor.execute(step, "hello");

      expect(callCount).toBe(1);
      expect(lastCall).toMatchObject({
        name: "testStep",
        input: "hello",
        output: 5,
      });
    });

    it("throws when executing on failed saga", async () => {
      const executor = createSagaExecutor();
      executor.fail("Previous error");

      const step: SagaStepDefinition<void, void> = {
        name: "testStep",
        execute: () => Promise.resolve(),
        compensate: () => Promise.resolve(),
      };

      await expect(executor.execute(step, undefined)).rejects.toThrow(
        "Cannot execute step"
      );
    });
  });

  describe("rollback", () => {
    it("executes compensations in reverse order", async () => {
      const compensationOrder: string[] = [];
      const executor = createSagaExecutor();

      const step1: SagaStepDefinition<string, string> = {
        name: "step1",
        execute: (input) => Promise.resolve(`${input}-1`),
        compensate: () => {
          compensationOrder.push("compensate1");
          return Promise.resolve();
        },
      };
      const step2: SagaStepDefinition<string, string> = {
        name: "step2",
        execute: (input) => Promise.resolve(`${input}-2`),
        compensate: () => {
          compensationOrder.push("compensate2");
          return Promise.resolve();
        },
      };
      const step3: SagaStepDefinition<string, string> = {
        name: "step3",
        execute: (input) => Promise.resolve(`${input}-3`),
        compensate: () => {
          compensationOrder.push("compensate3");
          return Promise.resolve();
        },
      };

      executor.registerStep(step1);
      executor.registerStep(step2);
      executor.registerStep(step3);

      await executor.execute(step1, "start");
      await executor.execute(step2, "start");
      await executor.execute(step3, "start");

      await executor.rollback();

      expect(compensationOrder).toEqual([
        "compensate3",
        "compensate2",
        "compensate1",
      ]);
    });

    it("passes correct input and output to compensation", async () => {
      const compensationCalls: Array<{ input: unknown; output: unknown }> = [];
      const executor = createSagaExecutor();

      const step: SagaStepDefinition<string, number> = {
        name: "testStep",
        execute: (input) => Promise.resolve(input.length),
        compensate: (input, output) => {
          compensationCalls.push({ input, output });
          return Promise.resolve();
        },
      };
      executor.registerStep(step);

      await executor.execute(step, "hello");
      await executor.rollback();

      expect(compensationCalls).toHaveLength(1);
      expect(compensationCalls[0]).toEqual({
        input: "hello",
        output: 5,
      });
    });

    it("sets rolledBack state to true", async () => {
      const executor = createSagaExecutor();
      const step: SagaStepDefinition<void, void> = {
        name: "testStep",
        execute: () => Promise.resolve(),
        compensate: () => Promise.resolve(),
      };
      executor.registerStep(step);

      await executor.execute(step, undefined);
      await executor.rollback();

      const state = executor.getState();
      expect(state.rolledBack).toBe(true);
      expect(state.status).toBe("rolled_back");
    });

    it("handles rollback with no completed steps", async () => {
      const executor = createSagaExecutor();

      await executor.rollback();

      const state = executor.getState();
      expect(state.rolledBack).toBe(true);
      expect(state.status).toBe("rolled_back");
    });

    it("calls onRollbackStart and onRollbackComplete callbacks", async () => {
      let rollbackStartCount = 0;
      let rollbackCompleteCount = 0;
      let rollbackCompleteSteps: unknown[] = [];
      let rollbackCompleteSuccess = false;
      const onRollbackStart = () => {
        rollbackStartCount += 1;
      };
      const onRollbackComplete = (steps: unknown[], success: boolean) => {
        rollbackCompleteCount += 1;
        rollbackCompleteSteps = steps;
        rollbackCompleteSuccess = success;
      };
      const config: SagaConfig = { onRollbackStart, onRollbackComplete };
      const executor = createSagaExecutor(config);

      const step: SagaStepDefinition<string, number> = {
        name: "testStep",
        execute: (input) => Promise.resolve(input.length),
        compensate: () => Promise.resolve(),
      };
      executor.registerStep(step);

      await executor.execute(step, "hello");
      await executor.rollback();

      expect(rollbackStartCount).toBe(1);
      expect(rollbackCompleteCount).toBe(1);
      expect(Array.isArray(rollbackCompleteSteps)).toBe(true);
      expect(rollbackCompleteSuccess).toBe(true);
    });

    it("continues rollback even if compensation fails", async () => {
      const compensationOrder: string[] = [];
      let errorStepName: string | null = null;
      let errorValue: unknown = null;
      const onStepError = (stepName: string, error: unknown) => {
        errorStepName = stepName;
        errorValue = error;
      };
      const executor = createSagaExecutor({ onStepError });

      const step1: SagaStepDefinition<void, void> = {
        name: "step1",
        execute: () => Promise.resolve(),
        compensate: () => {
          compensationOrder.push("compensate1");
          return Promise.resolve();
        },
      };
      const step2: SagaStepDefinition<void, void> = {
        name: "step2",
        execute: () => Promise.resolve(),
        compensate: () => Promise.reject(new Error("Compensation failed")),
      };
      const step3: SagaStepDefinition<void, void> = {
        name: "step3",
        execute: () => Promise.resolve(),
        compensate: () => {
          compensationOrder.push("compensate3");
          return Promise.resolve();
        },
      };

      executor.registerStep(step1);
      executor.registerStep(step2);
      executor.registerStep(step3);

      await executor.execute(step1, undefined);
      await executor.execute(step2, undefined);
      await executor.execute(step3, undefined);

      await executor.rollback();

      expect(compensationOrder).toEqual(["compensate3", "compensate1"]);
      expect(errorStepName).toBe("compensate:step2");
      expect(errorValue instanceof Error).toBe(true);
    });
  });

  describe("complete", () => {
    it("returns success result with output", () => {
      const executor = createSagaExecutor();

      const result = executor.complete({ data: "test" });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ data: "test" });
      expect(result.state.status).toBe("completed");
    });
  });

  describe("fail", () => {
    it("returns failure result with error", () => {
      const executor = createSagaExecutor();

      const result = executor.fail("Something went wrong");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Something went wrong");
      expect(result.state.status).toBe("failed");
    });
  });
});

describe("executeSaga", () => {
  it("returns success on successful operation", async () => {
    const executor = createSagaExecutor();

    const result = await executeSaga(executor, () =>
      Promise.resolve({ value: 42 })
    );

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ value: 42 });
    expect(result.state.status).toBe("completed");
  });

  it("rolls back and returns failure on error", async () => {
    let compensated = false;
    const executor = createSagaExecutor();

    const step: SagaStepDefinition<void, void> = {
      name: "testStep",
      execute: () => Promise.resolve(),
      compensate: () => {
        compensated = true;
        return Promise.resolve();
      },
    };
    executor.registerStep(step);

    const result = await executeSaga(executor, async () => {
      await executor.execute(step, undefined);
      throw new Error("Operation failed");
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Operation failed");
    expect(result.state.rolledBack).toBe(true);
    expect(compensated).toBe(true);
  });
});

describe("createSagaStep", () => {
  it("creates a step definition", () => {
    const step = createSagaStep({
      name: "myStep",
      execute: (input: string) => Promise.resolve(input.toUpperCase()),
      compensate: () => Promise.resolve(),
    });

    expect(step.name).toBe("myStep");
    expect(step.execute).toBeDefined();
    expect(step.compensate).toBeDefined();
  });
});

describe("createSagaBuilder", () => {
  it("builds executor with registered steps", async () => {
    const context = { teamId: "team-1" };
    const compensationOrder: string[] = [];

    const executor = createSagaBuilder(context)
      .addStep<string, number>(
        "step1",
        (input) => Promise.resolve(input.length),
        (_input, _output, ctx) => {
          compensationOrder.push(`compensate1:${ctx.teamId}`);
          return Promise.resolve();
        }
      )
      .addStep<number, string>(
        "step2",
        (input) => Promise.resolve(`Result: ${input}`),
        (_input, _output, ctx) => {
          compensationOrder.push(`compensate2:${ctx.teamId}`);
          return Promise.resolve();
        }
      )
      .build();

    const step1: SagaStepDefinition<string, number> = {
      name: "step1",
      execute: (input) => Promise.resolve(input.length),
      compensate: () => Promise.resolve(),
    };

    await executor.execute(step1, "hello");
    await executor.rollback();

    expect(compensationOrder).toContain("compensate1:team-1");
  });

  it("passes context to execute and compensate", async () => {
    interface Context {
      multiplier: number;
    }

    const context: Context = { multiplier: 2 };

    const executor = createSagaBuilder(context)
      .addStep<number, number>(
        "multiply",
        (input, ctx) => Promise.resolve(input * ctx.multiplier),
        () => Promise.resolve()
      )
      .build();

    const step: SagaStepDefinition<number, number> = {
      name: "multiply",
      execute: (input) => Promise.resolve(input * context.multiplier),
      compensate: () => Promise.resolve(),
    };
    executor.registerStep(step);

    const result = await executor.execute(step, 5);

    expect(result).toBe(10);
  });
});
