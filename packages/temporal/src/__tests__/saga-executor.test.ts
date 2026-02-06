import { describe, expect, it, vi } from "vitest";

vi.mock("@temporalio/workflow", () => ({
  workflowInfo: vi.fn(() => ({
    startTime: new Date(1_700_000_000_000),
  })),
}));

import {
  createSagaBuilder,
  createSagaExecutor,
  executeSaga,
  SagaExecutor,
} from "../workflows/canvas/saga/executor";
import type { SagaStepDefinition } from "../workflows/canvas/saga/types";

function createStep<TInput, TOutput>(
  name: string,
  executeResult: TOutput,
  options: { shouldThrow?: boolean } = {}
): SagaStepDefinition<TInput, TOutput> {
  return {
    name,
    execute: options.shouldThrow
      ? vi.fn(() => Promise.reject(new Error(`${name} failed`)))
      : vi.fn(() => Promise.resolve(executeResult)),
    compensate: vi.fn(() => Promise.resolve()),
  };
}

describe("SagaExecutor", () => {
  describe("initial state", () => {
    it("starts in pending state", () => {
      const executor = createSagaExecutor();
      const state = executor.getState();

      expect(state.status).toBe("pending");
      expect(state.completedSteps).toEqual([]);
      expect(state.rolledBack).toBe(false);
      expect(state.startedAt).toBe(1_700_000_000_000);
    });

    it("returns defensive copy of state", () => {
      const executor = createSagaExecutor();
      const state1 = executor.getState();
      const state2 = executor.getState();

      expect(state1).not.toBe(state2);
      expect(state1.completedSteps).not.toBe(state2.completedSteps);
    });
  });

  describe("execute", () => {
    it("executes a step and tracks it", async () => {
      const executor = createSagaExecutor();
      const step = createStep<string, number>("step1", 42);
      executor.registerStep(step);

      const result = await executor.execute(step, "input");

      expect(result).toBe(42);
      expect(step.execute).toHaveBeenCalledWith("input");

      const state = executor.getState();
      expect(state.status).toBe("running");
      expect(state.completedSteps).toHaveLength(1);
      expect(state.completedSteps[0]?.name).toBe("step1");
      expect(state.completedSteps[0]?.input).toBe("input");
      expect(state.completedSteps[0]?.output).toBe(42);
    });

    it("executes multiple steps in sequence", async () => {
      const executor = createSagaExecutor();
      const step1 = createStep<string, string>("step1", "a");
      const step2 = createStep<string, string>("step2", "b");
      executor.registerStep(step1);
      executor.registerStep(step2);

      await executor.execute(step1, "in1");
      await executor.execute(step2, "in2");

      const state = executor.getState();
      expect(state.completedSteps).toHaveLength(2);
      expect(state.completedSteps[0]?.name).toBe("step1");
      expect(state.completedSteps[1]?.name).toBe("step2");
    });

    it("rejects execution after failure", async () => {
      const executor = createSagaExecutor();
      const step = createStep("step1", "ok");
      executor.registerStep(step);

      executor.fail("something broke");

      await expect(executor.execute(step, "input")).rejects.toThrow(
        'Cannot execute step "step1" - saga is in failed state'
      );
    });

    it("rejects execution after rollback", async () => {
      const executor = createSagaExecutor();
      const step = createStep("step1", "ok");
      executor.registerStep(step);

      await executor.rollback();

      await expect(executor.execute(step, "input")).rejects.toThrow(
        'Cannot execute step "step1" - saga is in rolled_back state'
      );
    });

    it("calls onStepComplete callback", async () => {
      const onStepComplete = vi.fn();
      const executor = createSagaExecutor({ onStepComplete });
      const step = createStep("step1", "result");
      executor.registerStep(step);

      await executor.execute(step, "input");

      expect(onStepComplete).toHaveBeenCalledTimes(1);
      expect(onStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ name: "step1", output: "result" })
      );
    });
  });

  describe("rollback", () => {
    it("rolls back no steps when none completed", async () => {
      const executor = createSagaExecutor();
      await executor.rollback();

      const state = executor.getState();
      expect(state.status).toBe("rolled_back");
      expect(state.rolledBack).toBe(true);
    });

    it("compensates steps in reverse order", async () => {
      const executionOrder: string[] = [];
      const step1: SagaStepDefinition<string, string> = {
        name: "step1",
        execute: () => Promise.resolve("out1"),
        compensate: vi.fn(() => {
          executionOrder.push("compensate_step1");
          return Promise.resolve();
        }),
      };
      const step2: SagaStepDefinition<string, string> = {
        name: "step2",
        execute: () => Promise.resolve("out2"),
        compensate: vi.fn(() => {
          executionOrder.push("compensate_step2");
          return Promise.resolve();
        }),
      };
      const step3: SagaStepDefinition<string, string> = {
        name: "step3",
        execute: () => Promise.resolve("out3"),
        compensate: vi.fn(() => {
          executionOrder.push("compensate_step3");
          return Promise.resolve();
        }),
      };

      const executor = createSagaExecutor();
      executor.registerStep(step1);
      executor.registerStep(step2);
      executor.registerStep(step3);

      await executor.execute(step1, "a");
      await executor.execute(step2, "b");
      await executor.execute(step3, "c");

      await executor.rollback();

      expect(executionOrder).toEqual([
        "compensate_step3",
        "compensate_step2",
        "compensate_step1",
      ]);

      const state = executor.getState();
      expect(state.status).toBe("rolled_back");
      expect(state.rolledBack).toBe(true);
    });

    it("compensates with correct input/output", async () => {
      const step: SagaStepDefinition<string, number> = {
        name: "step1",
        execute: () => Promise.resolve(42),
        compensate: vi.fn(() => Promise.resolve()),
      };

      const executor = createSagaExecutor();
      executor.registerStep(step);
      await executor.execute(step, "my-input");

      await executor.rollback();

      expect(step.compensate).toHaveBeenCalledWith("my-input", 42);
    });

    it("continues rollback even if one compensation fails", async () => {
      const step1: SagaStepDefinition<string, string> = {
        name: "step1",
        execute: () => Promise.resolve("out1"),
        compensate: vi.fn(() => Promise.resolve()),
      };
      const step2: SagaStepDefinition<string, string> = {
        name: "step2",
        execute: () => Promise.resolve("out2"),
        compensate: vi.fn(() =>
          Promise.reject(new Error("compensation failed"))
        ),
      };

      const onStepError = vi.fn();
      const executor = createSagaExecutor({ onStepError });
      executor.registerStep(step1);
      executor.registerStep(step2);

      await executor.execute(step1, "a");
      await executor.execute(step2, "b");

      await executor.rollback();

      expect(step1.compensate).toHaveBeenCalled();
      expect(onStepError).toHaveBeenCalledWith(
        "compensate:step2",
        expect.any(Error)
      );

      const state = executor.getState();
      expect(state.status).toBe("rolled_back");
    });

    it("skips compensation for unregistered steps", async () => {
      const executor = createSagaExecutor();
      const step: SagaStepDefinition<string, string> = {
        name: "unregistered_step",
        execute: () => Promise.resolve("result"),
        compensate: vi.fn(() => Promise.resolve()),
      };

      await executor.execute(step, "input");
      await executor.rollback();

      expect(step.compensate).not.toHaveBeenCalled();
    });

    it("calls rollback lifecycle callbacks", async () => {
      const onRollbackStart = vi.fn();
      const onRollbackComplete = vi.fn();
      const step = createStep("step1", "result");

      const executor = createSagaExecutor({
        onRollbackStart,
        onRollbackComplete,
      });
      executor.registerStep(step);
      await executor.execute(step, "input");

      await executor.rollback();

      expect(onRollbackStart).toHaveBeenCalledWith([
        expect.objectContaining({ name: "step1" }),
      ]);
      expect(onRollbackComplete).toHaveBeenCalledWith(
        [expect.objectContaining({ name: "step1" })],
        true
      );
    });

    it("reports rollback failure in onRollbackComplete", async () => {
      const onRollbackComplete = vi.fn();
      const step: SagaStepDefinition<string, string> = {
        name: "step1",
        execute: () => Promise.resolve("result"),
        compensate: vi.fn(() => Promise.reject(new Error("boom"))),
      };

      const executor = createSagaExecutor({
        onRollbackComplete,
        onStepError: vi.fn(),
      });
      executor.registerStep(step);
      await executor.execute(step, "input");

      await executor.rollback();

      expect(onRollbackComplete).toHaveBeenCalledWith(expect.any(Array), false);
    });
  });

  describe("complete", () => {
    it("marks saga as completed with output", () => {
      const executor = createSagaExecutor();
      const result = executor.complete({ answer: 42 });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ answer: 42 });
      expect(result.state.status).toBe("completed");
      expect(result.state.completedAt).toBe(1_700_000_000_000);
    });
  });

  describe("fail", () => {
    it("marks saga as failed with error", () => {
      const executor = createSagaExecutor();
      const result = executor.fail("something went wrong");

      expect(result.success).toBe(false);
      expect(result.error).toBe("something went wrong");
      expect(result.state.status).toBe("failed");
      expect(result.state.completedAt).toBe(1_700_000_000_000);
    });
  });
});

describe("executeSaga", () => {
  it("returns success result on successful operation", async () => {
    const executor = createSagaExecutor();
    const result = await executeSaga(executor, () => Promise.resolve("done"));

    expect(result.success).toBe(true);
    expect(result.output).toBe("done");
    expect(result.state.status).toBe("completed");
  });

  it("rolls back and returns failure on error", async () => {
    const step: SagaStepDefinition<string, string> = {
      name: "step1",
      execute: () => Promise.resolve("out"),
      compensate: vi.fn(() => Promise.resolve()),
    };

    const executor = createSagaExecutor();
    executor.registerStep(step);
    await executor.execute(step, "input");

    const result = await executeSaga(executor, () =>
      Promise.reject(new Error("operation failed"))
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("operation failed");
    expect(result.state.status).toBe("failed");
    expect(result.state.rolledBack).toBe(true);
    expect(step.compensate).toHaveBeenCalled();
  });

  it("handles non-Error throws", async () => {
    const executor = createSagaExecutor();

    const result = await executeSaga(executor, () =>
      Promise.reject("string error")
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("string error");
  });
});

describe("createSagaBuilder", () => {
  it("builds executor with registered steps", () => {
    type Ctx = { teamId: string };
    const context: Ctx = { teamId: "team_1" };

    const executor = createSagaBuilder(context)
      .addStep<string, string>(
        "step1",
        (input, ctx) => Promise.resolve(`${input}_${ctx.teamId}`),
        () => Promise.resolve()
      )
      .build();

    expect(executor).toBeInstanceOf(SagaExecutor);
  });

  it("passes context to step execute and compensate", async () => {
    type Ctx = { teamId: string };
    const context: Ctx = { teamId: "team_1" };

    const executeFn = vi.fn((input: string, ctx: Ctx) =>
      Promise.resolve(`${input}_${ctx.teamId}`)
    );
    const compensateFn = vi.fn(() => Promise.resolve());

    const executor = createSagaBuilder(context)
      .addStep("step1", executeFn, compensateFn)
      .build();

    const stepDef: SagaStepDefinition<string, string> = {
      name: "step1",
      execute: (input) => executeFn(input, context),
      compensate: () => Promise.resolve(),
    };

    executor.registerStep(stepDef);
    const result = await executor.execute(stepDef, "hello");

    expect(result).toBe("hello_team_1");
  });

  it("supports chaining multiple steps", () => {
    const builder = createSagaBuilder({ id: "ctx" })
      .addStep(
        "step1",
        () => Promise.resolve("a"),
        () => Promise.resolve()
      )
      .addStep(
        "step2",
        () => Promise.resolve("b"),
        () => Promise.resolve()
      )
      .addStep(
        "step3",
        () => Promise.resolve("c"),
        () => Promise.resolve()
      );

    const executor = builder.build();
    expect(executor).toBeInstanceOf(SagaExecutor);
  });

  it("accepts config for lifecycle callbacks", () => {
    const onStepComplete = vi.fn();
    const executor = createSagaBuilder({}, { onStepComplete }).build();
    expect(executor).toBeInstanceOf(SagaExecutor);
  });
});
