import { afterEach, describe, expect, it } from "bun:test";
import type { ExecutionEvent } from "@openplane/types/canvas";
import { dispatchExecutionEvent } from "../execution-dispatcher";
import { useExecutionStore } from "../execution-store";

function getState() {
  return useExecutionStore.getState();
}

function currentExecution() {
  const exec = getState().currentExecution;
  if (!exec) {
    throw new Error("Expected currentExecution to exist");
  }
  return exec;
}

describe("dispatchExecutionEvent", () => {
  afterEach(() => {
    useExecutionStore.getState().reset();
  });

  it("execution.started creates a running execution", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });

    const exec = currentExecution();
    expect(exec.id).toBe("exec-1");
    expect(exec.agentCanvasId).toBe("canvas-1");
    expect(exec.status).toBe("RUNNING");
    expect(exec.startedAt).toBe(1000);
    expect(exec.steps).toEqual([]);
    expect(getState().isExecuting).toBe(true);
  });

  it("execution.progress updates currentNodeId", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });

    dispatchExecutionEvent({
      type: "execution.progress",
      executionId: "exec-1",
      currentNodeId: "node-2",
      stepsCompleted: 1,
      stepsTotal: 3,
      timestamp: 1100,
    });

    expect(currentExecution().currentNodeId).toBe("node-2");
  });

  it("step.started adds a running step", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });

    dispatchExecutionEvent({
      type: "step.started",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      nodeType: "llm",
      nodeName: "LLM Node",
      attempt: 1,
      timestamp: 1100,
    });

    const steps = currentExecution().steps;
    expect(steps).toHaveLength(1);

    const step = steps[0];
    expect(step?.nodeId).toBe("node-1");
    expect(step?.nodeType).toBe("llm");
    expect(step?.status).toBe("RUNNING");
    expect(step?.startedAt).toBe(1100);
  });

  it("step.completed updates step with output and timing", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "step.started",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      nodeType: "llm",
      nodeName: "LLM",
      attempt: 1,
      timestamp: 1100,
    });
    dispatchExecutionEvent({
      type: "step.completed",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      output: { result: "done" },
      durationMs: 500,
      tokenUsage: { input: 100, output: 50 },
      timestamp: 1600,
    });

    const step = currentExecution().steps[0];
    expect(step?.status).toBe("COMPLETED");
    expect(step?.output).toEqual({ result: "done" });
    expect(step?.latencyMs).toBe(500);
    expect(step?.completedAt).toBe(1600);
    expect(step?.tokenUsage).toEqual({ input: 100, output: 50 });
  });

  it("step.failed marks step as failed with error", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "step.started",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      nodeType: "llm",
      nodeName: "LLM",
      attempt: 1,
      timestamp: 1100,
    });
    dispatchExecutionEvent({
      type: "step.failed",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      error: "timeout",
      isRetryable: true,
      timestamp: 1200,
    });

    const step = currentExecution().steps[0];
    expect(step?.status).toBe("FAILED");
    expect(step?.error).toBe("timeout");
  });

  it("step.skipped adds completed step", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "step.skipped",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-skip",
      reason: "condition false",
      timestamp: 1100,
    });

    const step = currentExecution().steps[0];
    expect(step?.nodeId).toBe("node-skip");
    expect(step?.status).toBe("COMPLETED");
  });

  it("step.retrying sets step to PENDING", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "step.started",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      nodeType: "llm",
      nodeName: "LLM",
      attempt: 1,
      timestamp: 1100,
    });
    dispatchExecutionEvent({
      type: "step.retrying",
      executionId: "exec-1",
      stepId: "step-1",
      nodeId: "node-1",
      attempt: 2,
      maxAttempts: 3,
      retryDelayMs: 1000,
      timestamp: 1200,
    });

    expect(currentExecution().steps[0]?.status).toBe("PENDING");
  });

  it("execution.completed moves trace to history", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "execution.completed",
      executionId: "exec-1",
      status: "COMPLETED",
      output: { summary: "done" },
      durationMs: 2000,
      timestamp: 3000,
    });

    const state = getState();
    expect(state.isExecuting).toBe(false);
    expect(state.executionHistory).toHaveLength(1);

    const trace = state.executionHistory[0];
    expect(trace?.id).toBe("exec-1");
    expect(trace?.status).toBe("COMPLETED");
  });

  it("execution.failed sets error and stops execution", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "execution.failed",
      executionId: "exec-1",
      error: "OOM",
      timestamp: 2000,
    });

    const state = getState();
    expect(state.isExecuting).toBe(false);

    const trace = state.executionHistory[0];
    expect(trace?.status).toBe("FAILED");
    expect(trace?.error).toBe("OOM");
  });

  it("execution.cancelled stops execution", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "execution.cancelled",
      executionId: "exec-1",
      timestamp: 2000,
    });

    const state = getState();
    expect(state.isExecuting).toBe(false);
    expect(state.executionHistory[0]?.status).toBe("CANCELLED");
  });

  it("approval.requested sets WAITING_APPROVAL and currentNodeId", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "approval.requested",
      executionId: "exec-1",
      approvalId: "apr-1",
      nodeId: "approval-node",
      timestamp: 1100,
    });

    const exec = currentExecution();
    expect(exec.status).toBe("WAITING_APPROVAL");
    expect(exec.currentNodeId).toBe("approval-node");
  });

  it("approval.received resumes execution", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "approval.requested",
      executionId: "exec-1",
      approvalId: "apr-1",
      nodeId: "approval-node",
      timestamp: 1100,
    });
    dispatchExecutionEvent({
      type: "approval.received",
      executionId: "exec-1",
      approvalId: "apr-1",
      nodeId: "approval-node",
      approved: true,
      respondedById: "user-1",
      timestamp: 1200,
    });

    expect(currentExecution().status).toBe("RUNNING");
  });

  it("input.requested sets WAITING_INPUT and currentNodeId", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "input.requested",
      executionId: "exec-1",
      inputId: "inp-1",
      nodeId: "input-node",
      timestamp: 1100,
    });

    const exec = currentExecution();
    expect(exec.status).toBe("WAITING_INPUT");
    expect(exec.currentNodeId).toBe("input-node");
  });

  it("input.received resumes execution", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });
    dispatchExecutionEvent({
      type: "input.requested",
      executionId: "exec-1",
      inputId: "inp-1",
      nodeId: "input-node",
      timestamp: 1100,
    });
    dispatchExecutionEvent({
      type: "input.received",
      executionId: "exec-1",
      inputId: "inp-1",
      nodeId: "input-node",
      providedById: "user-1",
      timestamp: 1200,
    });

    expect(currentExecution().status).toBe("RUNNING");
  });

  it("heartbeat is a no-op", () => {
    dispatchExecutionEvent({
      type: "execution.started",
      executionId: "exec-1",
      agentCanvasId: "canvas-1",
      timestamp: 1000,
    });

    const before = currentExecution();
    dispatchExecutionEvent({ type: "heartbeat", timestamp: 1100 });
    const after = currentExecution();

    expect(after.status).toBe(before.status);
  });

  it("full lifecycle: start → step.started → step.completed → execution.completed", () => {
    const events: ExecutionEvent[] = [
      {
        type: "execution.started",
        executionId: "exec-life",
        agentCanvasId: "canvas-1",
        timestamp: 1000,
      },
      {
        type: "step.started",
        executionId: "exec-life",
        stepId: "s1",
        nodeId: "n1",
        nodeType: "llm",
        nodeName: "LLM",
        attempt: 1,
        timestamp: 1100,
      },
      {
        type: "step.completed",
        executionId: "exec-life",
        stepId: "s1",
        nodeId: "n1",
        output: "ok",
        durationMs: 200,
        timestamp: 1300,
      },
      {
        type: "execution.completed",
        executionId: "exec-life",
        status: "COMPLETED",
        durationMs: 500,
        timestamp: 1500,
      },
    ];

    for (const event of events) {
      dispatchExecutionEvent(event);
    }

    const state = getState();
    expect(state.isExecuting).toBe(false);
    expect(state.executionHistory).toHaveLength(1);
    expect(state.executionHistory[0]?.steps[0]?.status).toBe("COMPLETED");
  });
});
