import { describe, expect, it } from "vitest";
import {
  canvasMetricsRegistry,
  getCanvasMetrics,
  getCanvasMetricsContentType,
  recordActivityExecution,
  recordContinueAsNew,
  recordError,
  recordHistorySize,
  recordLoopIteration,
  recordNodeExecution,
  recordParallelBranch,
  recordSignalReceived,
  recordSubWorkflow,
  recordWorkflowComplete,
  recordWorkflowFailed,
  recordWorkflowStart,
} from "../observability/prometheus";

describe("canvas metrics registry", () => {
  it("is a valid prometheus registry", () => {
    expect(canvasMetricsRegistry).toBeDefined();
    expect(canvasMetricsRegistry.contentType).toContain("text/plain");
  });

  it("returns metrics in prometheus format", async () => {
    const metrics = await getCanvasMetrics();
    expect(typeof metrics).toBe("string");
  });

  it("returns correct content type", () => {
    const contentType = getCanvasMetricsContentType();
    expect(contentType).toContain("text/plain");
  });
});

describe("workflow metric recording", () => {
  it("records workflow start without throwing", () => {
    expect(() => recordWorkflowStart("team-test")).not.toThrow();
  });

  it("records workflow complete without throwing", () => {
    expect(() => recordWorkflowComplete("team-test", 5000)).not.toThrow();
  });

  it("records workflow failed without throwing", () => {
    expect(() => recordWorkflowFailed("team-test", 3000)).not.toThrow();
  });
});

describe("activity metric recording", () => {
  it("records activity execution success", () => {
    expect(() =>
      recordActivityExecution("executeNode", "success", 150)
    ).not.toThrow();
  });

  it("records activity execution failure", () => {
    expect(() =>
      recordActivityExecution("executeNode", "failure", 500)
    ).not.toThrow();
  });
});

describe("node metric recording", () => {
  it("records node execution with type", () => {
    expect(() =>
      recordNodeExecution("transform", "success", 200)
    ).not.toThrow();
  });

  it("records different node types", () => {
    const nodeTypes = [
      "transform",
      "condition",
      "loop",
      "parallel-split",
      "api-call",
      "llm",
    ];

    for (const nodeType of nodeTypes) {
      expect(() => recordNodeExecution(nodeType, "success", 100)).not.toThrow();
    }
  });
});

describe("signal metric recording", () => {
  it("records all signal types", () => {
    const signalTypes = [
      "pause",
      "resume",
      "cancel",
      "approval",
      "input",
    ] as const;

    for (const signalType of signalTypes) {
      expect(() => recordSignalReceived(signalType)).not.toThrow();
    }
  });
});

describe("error metric recording", () => {
  it("records retryable errors", () => {
    expect(() => recordError("RateLimitError", "true")).not.toThrow();
  });

  it("records non-retryable errors", () => {
    expect(() => recordError("AuthorizationError", "false")).not.toThrow();
  });
});

describe("history and continue-as-new metrics", () => {
  it("records history size", () => {
    expect(() => recordHistorySize("team-test", 5000)).not.toThrow();
  });

  it("records continue-as-new", () => {
    expect(() => recordContinueAsNew("team-test")).not.toThrow();
  });
});

describe("control flow metrics", () => {
  it("records parallel branch outcomes", () => {
    expect(() => recordParallelBranch("success")).not.toThrow();
    expect(() => recordParallelBranch("failure")).not.toThrow();
    expect(() => recordParallelBranch("skipped")).not.toThrow();
  });

  it("records loop iterations", () => {
    expect(() => recordLoopIteration("success")).not.toThrow();
    expect(() => recordLoopIteration("failure")).not.toThrow();
  });

  it("records sub-workflow outcomes", () => {
    expect(() => recordSubWorkflow("success")).not.toThrow();
    expect(() => recordSubWorkflow("failure")).not.toThrow();
  });
});

describe("metrics output integrity", () => {
  it("includes workflow execution metrics in output", async () => {
    recordWorkflowStart("team-output-test");
    recordWorkflowComplete("team-output-test", 1000);

    const metrics = await getCanvasMetrics();
    expect(metrics).toContain("canvas_workflow_executions_total");
    expect(metrics).toContain("canvas_workflow_duration_seconds");
  });

  it("includes node execution metrics in output", async () => {
    recordNodeExecution("test-node", "success", 250);

    const metrics = await getCanvasMetrics();
    expect(metrics).toContain("canvas_node_executions_total");
    expect(metrics).toContain("canvas_node_duration_seconds");
  });

  it("includes error metrics in output", async () => {
    recordError("TestError", "true");

    const metrics = await getCanvasMetrics();
    expect(metrics).toContain("canvas_errors_total");
  });
});
