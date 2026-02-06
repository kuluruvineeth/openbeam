import type { ExecutionPlanNode, StepExecution } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  buildCompletedStep,
  buildFailedStep,
  buildStepInput,
  buildWaitingStep,
  createInitialTrace,
  extractBranchId,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";

function createNode(
  id: string,
  type: ExecutionPlanNode["type"]
): ExecutionPlanNode {
  return {
    id,
    type,
    data: {},
    inbound: [],
    outbound: [],
  };
}

describe("createInitialTrace", () => {
  it("creates trace with running status", () => {
    const result = createInitialTrace(
      { executionId: "exec-123", agentCanvasId: "canvas-456" },
      1000
    );

    expect(result.id).toBe("exec-123");
    expect(result.agentCanvasId).toBe("canvas-456");
    expect(result.status).toBe("RUNNING");
    expect(result.steps).toEqual([]);
    expect(result.startedAt).toBe(1000);
  });
});

describe("buildStepInput", () => {
  it("returns inputRef when provided", () => {
    const inputRef = { id: "ref-123", storage: "db" as const };

    const result = buildStepInput({ data: "test" }, inputRef);

    expect(result).toEqual({ inputRef });
    expect(result.input).toBeUndefined();
  });

  it("returns input when no ref and input is not a ref", () => {
    const input = { data: "test" };

    const result = buildStepInput(input, undefined);

    expect(result).toEqual({ input });
    expect(result.inputRef).toBeUndefined();
  });

  it("returns empty object when input is undefined", () => {
    const result = buildStepInput(undefined, undefined);

    expect(result).toEqual({});
  });

  it("returns empty object when input is an ExecutionDataRef", () => {
    const input = { id: "ref-123", storage: "db" };

    const result = buildStepInput(input, undefined);

    expect(result).toEqual({});
  });
});

describe("buildCompletedStep", () => {
  it("creates completed step execution", () => {
    const node = createNode("transform-1", "transform");
    const input = { data: "input" };
    const resultData = {
      output: { data: "output" },
      startedAt: 1000,
      completedAt: 1100,
      latencyMs: 100,
    };

    const result = buildCompletedStep(node, input, resultData);

    expect(result.nodeId).toBe("transform-1");
    expect(result.nodeType).toBe("transform");
    expect(result.status).toBe("COMPLETED");
    expect(result.input).toEqual({ data: "input" });
    expect(result.output).toEqual({ data: "output" });
    expect(result.startedAt).toBe(1000);
    expect(result.completedAt).toBe(1100);
    expect(result.latencyMs).toBe(100);
  });

  it("uses outputRef instead of output when provided", () => {
    const node = createNode("transform-1", "transform");
    const resultData = {
      output: { data: "output" },
      outputRef: { id: "ref-456", storage: "db" as const },
      startedAt: 1000,
      completedAt: 1100,
      latencyMs: 100,
    };

    const result = buildCompletedStep(node, {}, resultData);

    expect(result.output).toBeUndefined();
    expect(result.outputRef).toEqual({ id: "ref-456", storage: "db" });
  });

  it("uses inputRef when provided", () => {
    const node = createNode("transform-1", "transform");
    const resultData = {
      output: {},
      inputRef: { id: "ref-123", storage: "db" as const },
      startedAt: 1000,
      completedAt: 1100,
      latencyMs: 100,
    };

    const result = buildCompletedStep(node, {}, resultData);

    expect(result.inputRef).toEqual({ id: "ref-123", storage: "db" });
    expect(result.input).toBeUndefined();
  });
});

describe("buildFailedStep", () => {
  it("creates failed step execution", () => {
    const node = createNode("http-1", "http_request");

    const result = buildFailedStep({
      node,
      input: { url: "http://example.com" },
      error: "Connection timeout",
      startedAt: 1000,
      completedAt: 1500,
    });

    expect(result.nodeId).toBe("http-1");
    expect(result.nodeType).toBe("http_request");
    expect(result.status).toBe("FAILED");
    expect(result.input).toEqual({ url: "http://example.com" });
    expect(result.error).toBe("Connection timeout");
    expect(result.latencyMs).toBe(500);
  });

  it("uses inputRef when input is ExecutionDataRef", () => {
    const node = createNode("transform-1", "transform");
    const inputRef = { id: "ref-123", storage: "db" as const };

    const result = buildFailedStep({
      node,
      input: inputRef,
      error: "Failed",
      startedAt: 1000,
      completedAt: 1100,
    });

    expect(result.inputRef).toEqual(inputRef);
    expect(result.input).toBeUndefined();
  });
});

describe("buildWaitingStep", () => {
  it("creates waiting step execution", () => {
    const node = createNode("approval-1", "approval");

    const result = buildWaitingStep({
      node,
      input: { request: "Please approve" },
      inputRef: undefined,
      status: "WAITING_APPROVAL",
      startedAt: 1000,
    });

    expect(result.nodeId).toBe("approval-1");
    expect(result.nodeType).toBe("approval");
    expect(result.status).toBe("WAITING_APPROVAL");
    expect(result.input).toEqual({ request: "Please approve" });
    expect(result.startedAt).toBe(1000);
    expect(result.completedAt).toBeUndefined();
  });

  it("uses inputRef when provided", () => {
    const node = createNode("input-1", "input");
    const inputRef = { id: "ref-123", storage: "db" as const };

    const result = buildWaitingStep({
      node,
      input: {},
      inputRef,
      status: "WAITING_INPUT",
      startedAt: 1000,
    });

    expect(result.inputRef).toEqual(inputRef);
    expect(result.input).toBeUndefined();
  });
});

describe("updateTraceForInput", () => {
  it("sets trace input from step input", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    const step: StepExecution = {
      nodeId: "start",
      nodeType: "start",
      status: "COMPLETED",
      input: { message: "hello" },
      startedAt: 1000,
    };

    updateTraceForInput(trace, step);

    expect(trace.input).toEqual({ message: "hello" });
    expect(trace.inputRef).toBeUndefined();
  });

  it("sets trace inputRef from step inputRef", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    const step: StepExecution = {
      nodeId: "start",
      nodeType: "start",
      status: "COMPLETED",
      inputRef: { id: "ref-123", storage: "db" },
      startedAt: 1000,
    };

    updateTraceForInput(trace, step);

    expect(trace.inputRef).toEqual({ id: "ref-123", storage: "db" });
    expect(trace.input).toBeUndefined();
  });

  it("does not overwrite existing trace input", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    trace.input = { original: "value" };

    const step: StepExecution = {
      nodeId: "transform",
      nodeType: "transform",
      status: "COMPLETED",
      input: { new: "value" },
      startedAt: 1000,
    };

    updateTraceForInput(trace, step);

    expect(trace.input).toEqual({ original: "value" });
  });

  it("does not overwrite existing trace inputRef", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    trace.inputRef = { id: "original-ref", storage: "db" };

    const step: StepExecution = {
      nodeId: "transform",
      nodeType: "transform",
      status: "COMPLETED",
      inputRef: { id: "new-ref", storage: "db" },
      startedAt: 1000,
    };

    updateTraceForInput(trace, step);

    expect(trace.inputRef).toEqual({ id: "original-ref", storage: "db" });
  });
});

describe("updateTraceForOutput", () => {
  it("sets trace output from step output", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    const step: StepExecution = {
      nodeId: "end",
      nodeType: "end",
      status: "COMPLETED",
      output: { result: "success" },
      startedAt: 1000,
    };

    updateTraceForOutput(trace, step);

    expect(trace.output).toEqual({ result: "success" });
    expect(trace.outputRef).toBeUndefined();
  });

  it("sets trace outputRef from step outputRef", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    const step: StepExecution = {
      nodeId: "end",
      nodeType: "end",
      status: "COMPLETED",
      outputRef: { id: "ref-456", storage: "db" },
      startedAt: 1000,
    };

    updateTraceForOutput(trace, step);

    expect(trace.outputRef).toEqual({ id: "ref-456", storage: "db" });
    expect(trace.output).toBeUndefined();
  });

  it("clears output when outputRef is set", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    trace.output = { old: "value" };

    const step: StepExecution = {
      nodeId: "end",
      nodeType: "end",
      status: "COMPLETED",
      outputRef: { id: "ref-456", storage: "db" },
      startedAt: 1000,
    };

    updateTraceForOutput(trace, step);

    expect(trace.output).toBeUndefined();
    expect(trace.outputRef).toEqual({ id: "ref-456", storage: "db" });
  });

  it("overwrites previous output with new output", () => {
    const trace = createInitialTrace(
      { executionId: "exec-1", agentCanvasId: "canvas-1" },
      1000
    );
    trace.output = { first: "value" };

    const step: StepExecution = {
      nodeId: "end",
      nodeType: "end",
      status: "COMPLETED",
      output: { second: "value" },
      startedAt: 1000,
    };

    updateTraceForOutput(trace, step);

    expect(trace.output).toEqual({ second: "value" });
  });
});

describe("extractBranchId", () => {
  it("extracts string output as branch ID", () => {
    expect(extractBranchId("approved")).toBe("approved");
  });

  it("extracts branchId from object", () => {
    expect(extractBranchId({ branchId: "rejected" })).toBe("rejected");
  });

  it("returns null for number", () => {
    expect(extractBranchId(123)).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractBranchId(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractBranchId(undefined)).toBeNull();
  });

  it("returns null for object without branchId", () => {
    expect(extractBranchId({ value: "test" })).toBeNull();
  });

  it("returns null for object with non-string branchId", () => {
    expect(extractBranchId({ branchId: 123 })).toBeNull();
  });

  it("returns null for array", () => {
    expect(extractBranchId(["branch"])).toBeNull();
  });
});
