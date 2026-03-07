import type { ExecutionPlanNode, ExecutionTrace } from "@openbeam/types/canvas";
import { describe, expect, it } from "vitest";
import {
  buildCompletedStep,
  buildFailedStep,
  buildStepInput,
  buildWaitingStep,
  createInitialTrace,
  updateTraceForInput,
  updateTraceForOutput,
} from "../workflows/canvas/trace/builder";

function createNode(id: string, type: string): ExecutionPlanNode {
  return {
    id,
    type,
    data: {},
    inbound: [],
    outbound: [],
  } as unknown as ExecutionPlanNode;
}

describe("createInitialTrace", () => {
  it("creates trace with RUNNING status", () => {
    const trace = createInitialTrace(
      { executionId: "exec_1", agentCanvasId: "canvas_1" },
      1_700_000_000_000
    );

    expect(trace.id).toBe("exec_1");
    expect(trace.agentCanvasId).toBe("canvas_1");
    expect(trace.status).toBe("RUNNING");
    expect(trace.steps).toEqual([]);
    expect(trace.startedAt).toBe(1_700_000_000_000);
  });
});

describe("buildStepInput", () => {
  it("returns inputRef when provided", () => {
    const ref = { id: "ref_1", storage: "db" as const };
    const result = buildStepInput("some-input", ref);

    expect(result).toEqual({ inputRef: ref });
    expect(result.input).toBeUndefined();
  });

  it("returns input when no ref and input is not a data ref", () => {
    const result = buildStepInput({ key: "value" }, undefined);

    expect(result).toEqual({ input: { key: "value" } });
    expect(result.inputRef).toBeUndefined();
  });

  it("returns empty object when input is an ExecutionDataRef", () => {
    const dataRef = { id: "data_1", storage: "db" };
    const result = buildStepInput(dataRef, undefined);

    expect(result).toEqual({});
  });

  it("returns empty object when input is undefined", () => {
    const result = buildStepInput(undefined, undefined);
    expect(result).toEqual({});
  });

  it("returns input for primitive values", () => {
    expect(buildStepInput("hello", undefined)).toEqual({ input: "hello" });
    expect(buildStepInput(42, undefined)).toEqual({ input: 42 });
    expect(buildStepInput(null, undefined)).toEqual({ input: null });
  });
});

describe("buildCompletedStep", () => {
  it("builds a completed step with output", () => {
    const node = createNode("node_1", "transform");

    const step = buildCompletedStep(node, "input-data", {
      output: { result: "done" },
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      latencyMs: 1000,
    });

    expect(step.nodeId).toBe("node_1");
    expect(step.nodeType).toBe("transform");
    expect(step.status).toBe("COMPLETED");
    expect(step.output).toEqual({ result: "done" });
    expect(step.startedAt).toBe(1_700_000_000_000);
    expect(step.completedAt).toBe(1_700_000_001_000);
    expect(step.latencyMs).toBe(1000);
  });

  it("uses outputRef when provided", () => {
    const node = createNode("node_1", "llm");
    const outputRef = { id: "out_1", storage: "db" as const };

    const step = buildCompletedStep(node, "input", {
      outputRef,
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      latencyMs: 1000,
    });

    expect(step.output).toBeUndefined();
    expect(step.outputRef).toEqual(outputRef);
  });

  it("uses inputRef when provided", () => {
    const node = createNode("node_1", "transform");
    const inputRef = { id: "in_1", storage: "db" as const };

    const step = buildCompletedStep(node, "raw-input", {
      inputRef,
      output: "result",
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      latencyMs: 1000,
    });

    expect(step.inputRef).toEqual(inputRef);
    expect(step.input).toBeUndefined();
  });
});

describe("buildFailedStep", () => {
  it("builds a failed step with error", () => {
    const node = createNode("node_1", "tool");

    const step = buildFailedStep({
      node,
      input: { query: "test" },
      error: "Connection timeout",
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_002_000,
    });

    expect(step.nodeId).toBe("node_1");
    expect(step.nodeType).toBe("tool");
    expect(step.status).toBe("FAILED");
    expect(step.error).toBe("Connection timeout");
    expect(step.input).toEqual({ query: "test" });
    expect(step.latencyMs).toBe(2000);
  });

  it("detects ExecutionDataRef as input and uses inputRef", () => {
    const node = createNode("node_1", "transform");
    const dataRef = { id: "data_1", storage: "db" };

    const step = buildFailedStep({
      node,
      input: dataRef,
      error: "Processing failed",
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
    });

    expect(step.inputRef).toEqual(dataRef);
    expect(step.input).toBeUndefined();
  });
});

describe("buildWaitingStep", () => {
  it("builds a waiting step for approval", () => {
    const node = createNode("node_1", "approval");

    const step = buildWaitingStep({
      node,
      input: { data: "review this" },
      inputRef: undefined,
      status: "WAITING_APPROVAL",
      startedAt: 1_700_000_000_000,
    });

    expect(step.nodeId).toBe("node_1");
    expect(step.nodeType).toBe("approval");
    expect(step.status).toBe("WAITING_APPROVAL");
    expect(step.input).toEqual({ data: "review this" });
    expect(step.startedAt).toBe(1_700_000_000_000);
    expect(step.completedAt).toBeUndefined();
  });

  it("builds a waiting step for input", () => {
    const node = createNode("node_2", "input");

    const step = buildWaitingStep({
      node,
      input: undefined,
      inputRef: { id: "ref_1", storage: "db" as const },
      status: "WAITING_INPUT",
      startedAt: 1_700_000_000_000,
    });

    expect(step.status).toBe("WAITING_INPUT");
    expect(step.inputRef).toEqual({ id: "ref_1", storage: "db" });
  });
});

describe("updateTraceForInput", () => {
  it("sets trace input from first step with input", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
    } as ExecutionTrace;

    updateTraceForInput(trace, {
      nodeId: "n1",
      nodeType: "start",
      status: "COMPLETED",
      input: { trigger: "manual" },
    });

    expect(trace.input).toEqual({ trigger: "manual" });
  });

  it("sets trace inputRef from step with inputRef", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
    } as ExecutionTrace;

    const ref = { id: "ref_1", storage: "db" as const };

    updateTraceForInput(trace, {
      nodeId: "n1",
      nodeType: "start",
      status: "COMPLETED",
      inputRef: ref,
    });

    expect(trace.inputRef).toEqual(ref);
    expect(trace.input).toBeUndefined();
  });

  it("does not overwrite existing trace input", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
      input: { original: true },
    } as ExecutionTrace;

    updateTraceForInput(trace, {
      nodeId: "n2",
      nodeType: "transform",
      status: "COMPLETED",
      input: { should_not_replace: true },
    });

    expect(trace.input).toEqual({ original: true });
  });

  it("does not overwrite existing trace inputRef", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
      inputRef: { id: "original", storage: "db" },
    } as ExecutionTrace;

    updateTraceForInput(trace, {
      nodeId: "n2",
      nodeType: "transform",
      status: "COMPLETED",
      input: { new_data: true },
    });

    expect(trace.inputRef).toEqual({ id: "original", storage: "db" });
  });
});

describe("updateTraceForOutput", () => {
  it("sets trace output from step output", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
    } as ExecutionTrace;

    updateTraceForOutput(trace, {
      nodeId: "n1",
      nodeType: "end",
      status: "COMPLETED",
      output: { result: "done" },
    });

    expect(trace.output).toEqual({ result: "done" });
  });

  it("sets trace outputRef and clears output", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
      output: { old_data: true },
    } as ExecutionTrace;

    const ref = { id: "out_1", storage: "db" as const };

    updateTraceForOutput(trace, {
      nodeId: "n1",
      nodeType: "end",
      status: "COMPLETED",
      outputRef: ref,
    });

    expect(trace.outputRef).toEqual(ref);
    expect(trace.output).toBeUndefined();
  });

  it("overwrites previous output with new output", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
      output: { first: true },
    } as ExecutionTrace;

    updateTraceForOutput(trace, {
      nodeId: "n2",
      nodeType: "end",
      status: "COMPLETED",
      output: { second: true },
    });

    expect(trace.output).toEqual({ second: true });
  });

  it("clears outputRef when setting regular output", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
      outputRef: { id: "old_ref", storage: "db" },
    } as ExecutionTrace;

    updateTraceForOutput(trace, {
      nodeId: "n1",
      nodeType: "end",
      status: "COMPLETED",
      output: { inline_result: true },
    });

    expect(trace.output).toEqual({ inline_result: true });
    expect(trace.outputRef).toBeUndefined();
  });

  it("does nothing when step has no output or outputRef", () => {
    const trace: ExecutionTrace = {
      id: "exec_1",
      agentCanvasId: "canvas_1",
      status: "RUNNING",
      steps: [],
      startedAt: 1_700_000_000_000,
      output: { existing: true },
    } as ExecutionTrace;

    updateTraceForOutput(trace, {
      nodeId: "n1",
      nodeType: "transform",
      status: "COMPLETED",
    });

    expect(trace.output).toEqual({ existing: true });
  });
});
