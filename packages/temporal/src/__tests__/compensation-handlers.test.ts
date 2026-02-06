import { describe, expect, it, vi } from "vitest";
import {
  createCompensationHandlers,
  getCompensationHandler,
  hasCompensationHandler,
  listCompensationHandlers,
  registerCompensationHandler,
} from "../workflows/canvas/saga/compensation";
import type {
  CreateStepCompensation,
  StoreOutputCompensation,
  UpdateExecutionCompensation,
} from "../workflows/canvas/saga/types";

describe("compensation handler registry", () => {
  it("has pre-registered handlers", () => {
    expect(hasCompensationHandler("createCanvasExecutionStep")).toBe(true);
    expect(hasCompensationHandler("updateCanvasExecution")).toBe(true);
    expect(hasCompensationHandler("storeParallelMapOutput")).toBe(true);
  });

  it("returns false for unknown handlers", () => {
    expect(hasCompensationHandler("nonExistentHandler")).toBe(false);
  });

  it("gets handler by name", () => {
    const handler = getCompensationHandler("createCanvasExecutionStep");
    expect(handler).toBeDefined();
    expect(handler?.description).toBe(
      "Deletes a canvas execution step that was created during the saga"
    );
  });

  it("returns undefined for unknown handler", () => {
    expect(getCompensationHandler("unknown")).toBeUndefined();
  });

  it("lists all registered handlers", () => {
    const handlers = listCompensationHandlers();
    expect(handlers.length).toBeGreaterThanOrEqual(3);

    const names = handlers.map((h) => h.name);
    expect(names).toContain("createCanvasExecutionStep");
    expect(names).toContain("updateCanvasExecution");
    expect(names).toContain("storeParallelMapOutput");
  });

  it("pre-registered handlers throw without activity context", () => {
    const handler = getCompensationHandler("createCanvasExecutionStep");
    const output: CreateStepCompensation = {
      stepId: "step_1",
      nodeId: "node_1",
      executionId: "exec_1",
      teamId: "team_1",
    };

    expect(() =>
      handler?.handler(undefined, output, {
        executionId: "exec_1",
        teamId: "team_1",
      })
    ).toThrow("requires activity context");
  });

  it("updateCanvasExecution handler throws with execution ID", () => {
    const handler = getCompensationHandler("updateCanvasExecution");
    const output: UpdateExecutionCompensation = {
      executionId: "exec_42",
      teamId: "team_1",
      previousStatus: "RUNNING",
    };

    expect(() =>
      handler?.handler(undefined, output, {
        executionId: "exec_42",
        teamId: "team_1",
      })
    ).toThrow("Execution ID: exec_42");
  });

  it("storeParallelMapOutput handler throws with data ID", () => {
    const handler = getCompensationHandler("storeParallelMapOutput");
    const output: StoreOutputCompensation = {
      executionId: "exec_1",
      teamId: "team_1",
      nodeId: "node_1",
      dataId: "data_99",
    };

    expect(() =>
      handler?.handler(undefined, output, {
        executionId: "exec_1",
        teamId: "team_1",
      })
    ).toThrow("Data ID: data_99");
  });

  it("registers custom handler", () => {
    registerCompensationHandler(
      "customTestHandler",
      () => Promise.resolve(),
      "Custom test handler"
    );

    expect(hasCompensationHandler("customTestHandler")).toBe(true);
    const handler = getCompensationHandler("customTestHandler");
    expect(handler?.description).toBe("Custom test handler");
  });
});

describe("createCompensationHandlers", () => {
  function createMockActivities() {
    return {
      deleteCanvasExecutionStep: vi.fn(() => Promise.resolve()),
      revertCanvasExecutionStatus: vi.fn(() => Promise.resolve()),
      clearStoredOutput: vi.fn(() => Promise.resolve()),
    };
  }

  it("creates all three compensation handlers", () => {
    const activities = createMockActivities();
    const context = { executionId: "exec_1", teamId: "team_1" };
    const handlers = createCompensationHandlers(activities, context);

    expect(handlers.compensateCreateStep).toBeTypeOf("function");
    expect(handlers.compensateUpdateExecution).toBeTypeOf("function");
    expect(handlers.compensateStoreOutput).toBeTypeOf("function");
  });

  it("compensateCreateStep calls deleteCanvasExecutionStep", async () => {
    const activities = createMockActivities();
    const context = { executionId: "exec_1", teamId: "team_1" };
    const handlers = createCompensationHandlers(activities, context);

    const output: CreateStepCompensation = {
      stepId: "step_1",
      nodeId: "node_1",
      executionId: "exec_1",
      teamId: "team_1",
    };

    await handlers.compensateCreateStep(undefined, output);

    expect(activities.deleteCanvasExecutionStep).toHaveBeenCalledWith({
      stepId: "step_1",
      teamId: "team_1",
    });
  });

  it("compensateUpdateExecution calls revertCanvasExecutionStatus", async () => {
    const activities = createMockActivities();
    const context = { executionId: "exec_1", teamId: "team_1" };
    const handlers = createCompensationHandlers(activities, context);

    const output: UpdateExecutionCompensation = {
      executionId: "exec_1",
      teamId: "team_1",
      previousStatus: "RUNNING",
      previousNodeId: "node_5",
    };

    await handlers.compensateUpdateExecution(undefined, output);

    expect(activities.revertCanvasExecutionStatus).toHaveBeenCalledWith({
      executionId: "exec_1",
      teamId: "team_1",
      status: "RUNNING",
      currentNodeId: "node_5",
    });
  });

  it("compensateStoreOutput calls clearStoredOutput when dataId present", async () => {
    const activities = createMockActivities();
    const context = { executionId: "exec_1", teamId: "team_1" };
    const handlers = createCompensationHandlers(activities, context);

    const output: StoreOutputCompensation = {
      executionId: "exec_1",
      teamId: "team_1",
      nodeId: "node_1",
      dataId: "data_1",
    };

    await handlers.compensateStoreOutput(undefined, output);

    expect(activities.clearStoredOutput).toHaveBeenCalledWith({
      executionId: "exec_1",
      teamId: "team_1",
      dataId: "data_1",
    });
  });

  it("compensateStoreOutput skips when no dataId", async () => {
    const activities = createMockActivities();
    const context = { executionId: "exec_1", teamId: "team_1" };
    const handlers = createCompensationHandlers(activities, context);

    const output: StoreOutputCompensation = {
      executionId: "exec_1",
      teamId: "team_1",
      nodeId: "node_1",
    };

    await handlers.compensateStoreOutput(undefined, output);

    expect(activities.clearStoredOutput).not.toHaveBeenCalled();
  });

  it("uses context teamId for all activities", async () => {
    const activities = createMockActivities();
    const context = { executionId: "exec_1", teamId: "team_ctx" };
    const handlers = createCompensationHandlers(activities, context);

    await handlers.compensateCreateStep(undefined, {
      stepId: "s1",
      nodeId: "n1",
      executionId: "exec_1",
      teamId: "team_other",
    });

    expect(activities.deleteCanvasExecutionStep).toHaveBeenCalledWith({
      stepId: "s1",
      teamId: "team_ctx",
    });
  });
});
