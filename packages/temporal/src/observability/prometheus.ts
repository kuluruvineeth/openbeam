import { Counter, Gauge, Histogram, Registry } from "prom-client";

export const canvasMetricsRegistry = new Registry();

export const workflowExecutionsTotal = new Counter({
  name: "canvas_workflow_executions_total",
  help: "Total number of canvas workflow executions",
  labelNames: ["status", "team_id"] as const,
  registers: [canvasMetricsRegistry],
});

export const workflowDurationSeconds = new Histogram({
  name: "canvas_workflow_duration_seconds",
  help: "Duration of canvas workflow executions in seconds",
  labelNames: ["status"] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  registers: [canvasMetricsRegistry],
});

export const activityExecutionsTotal = new Counter({
  name: "canvas_activity_executions_total",
  help: "Total number of canvas activity executions",
  labelNames: ["activity_type", "status"] as const,
  registers: [canvasMetricsRegistry],
});

export const activityDurationSeconds = new Histogram({
  name: "canvas_activity_duration_seconds",
  help: "Duration of canvas activity executions in seconds",
  labelNames: ["activity_type"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
  registers: [canvasMetricsRegistry],
});

export const nodeExecutionsTotal = new Counter({
  name: "canvas_node_executions_total",
  help: "Total canvas node executions by type",
  labelNames: ["node_type", "status"] as const,
  registers: [canvasMetricsRegistry],
});

export const nodeDurationSeconds = new Histogram({
  name: "canvas_node_duration_seconds",
  help: "Duration of canvas node executions in seconds",
  labelNames: ["node_type"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [canvasMetricsRegistry],
});

export const continueAsNewTotal = new Counter({
  name: "canvas_continue_as_new_total",
  help: "Number of continueAsNew invocations",
  labelNames: ["team_id"] as const,
  registers: [canvasMetricsRegistry],
});

export const signalsReceivedTotal = new Counter({
  name: "canvas_signals_received_total",
  help: "Number of signals received by canvas workflows",
  labelNames: ["signal_type"] as const,
  registers: [canvasMetricsRegistry],
});

export const errorsTotal = new Counter({
  name: "canvas_errors_total",
  help: "Total canvas errors by type",
  labelNames: ["error_type", "retryable"] as const,
  registers: [canvasMetricsRegistry],
});

export const workflowHistorySize = new Histogram({
  name: "canvas_workflow_history_size_events",
  help: "Workflow history size in events",
  labelNames: ["team_id"] as const,
  buckets: [100, 500, 1000, 2500, 5000, 7500, 10_000, 15_000, 20_000],
  registers: [canvasMetricsRegistry],
});

export const activeWorkflowsGauge = new Gauge({
  name: "canvas_active_workflows",
  help: "Number of currently active canvas workflows",
  labelNames: ["team_id"] as const,
  registers: [canvasMetricsRegistry],
});

export const waitingWorkflowsGauge = new Gauge({
  name: "canvas_waiting_workflows",
  help: "Number of canvas workflows waiting for input or approval",
  labelNames: ["wait_type"] as const,
  registers: [canvasMetricsRegistry],
});

export const parallelBranchesTotal = new Counter({
  name: "canvas_parallel_branches_total",
  help: "Total parallel branches executed",
  labelNames: ["status"] as const,
  registers: [canvasMetricsRegistry],
});

export const loopIterationsTotal = new Counter({
  name: "canvas_loop_iterations_total",
  help: "Total loop iterations executed",
  labelNames: ["status"] as const,
  registers: [canvasMetricsRegistry],
});

export const subWorkflowsTotal = new Counter({
  name: "canvas_sub_workflows_total",
  help: "Total sub-workflow executions",
  labelNames: ["status"] as const,
  registers: [canvasMetricsRegistry],
});

export const approvalResponseTimeSeconds = new Histogram({
  name: "canvas_approval_response_time_seconds",
  help: "Time taken to receive approval response",
  labelNames: ["outcome"] as const,
  buckets: [1, 5, 30, 60, 300, 600, 1800, 3600],
  registers: [canvasMetricsRegistry],
});

export const inputResponseTimeSeconds = new Histogram({
  name: "canvas_input_response_time_seconds",
  help: "Time taken to receive user input response",
  labelNames: ["outcome"] as const,
  buckets: [1, 5, 30, 60, 300, 600, 1800, 3600],
  registers: [canvasMetricsRegistry],
});

export function recordWorkflowStart(teamId: string): void {
  workflowExecutionsTotal.labels("started", teamId).inc();
  activeWorkflowsGauge.labels(teamId).inc();
}

export function recordWorkflowComplete(
  teamId: string,
  durationMs: number
): void {
  workflowExecutionsTotal.labels("completed", teamId).inc();
  workflowDurationSeconds.labels("completed").observe(durationMs / 1000);
  activeWorkflowsGauge.labels(teamId).dec();
}

export function recordWorkflowFailed(teamId: string, durationMs: number): void {
  workflowExecutionsTotal.labels("failed", teamId).inc();
  workflowDurationSeconds.labels("failed").observe(durationMs / 1000);
  activeWorkflowsGauge.labels(teamId).dec();
}

export function recordWorkflowCancelled(
  teamId: string,
  durationMs: number
): void {
  workflowExecutionsTotal.labels("cancelled", teamId).inc();
  workflowDurationSeconds.labels("cancelled").observe(durationMs / 1000);
  activeWorkflowsGauge.labels(teamId).dec();
}

export function recordActivityExecution(
  activityType: string,
  status: "success" | "failure",
  durationMs: number
): void {
  activityExecutionsTotal.labels(activityType, status).inc();
  activityDurationSeconds.labels(activityType).observe(durationMs / 1000);
}

export function recordNodeExecution(
  nodeType: string,
  status: "success" | "failure",
  durationMs: number
): void {
  nodeExecutionsTotal.labels(nodeType, status).inc();
  nodeDurationSeconds.labels(nodeType).observe(durationMs / 1000);
}

export function recordContinueAsNew(teamId: string): void {
  continueAsNewTotal.labels(teamId).inc();
}

export function recordSignalReceived(
  signalType: "pause" | "resume" | "cancel" | "approval" | "input"
): void {
  signalsReceivedTotal.labels(signalType).inc();
}

export function recordError(
  errorType: string,
  retryable: "true" | "false"
): void {
  errorsTotal.labels(errorType, retryable).inc();
}

export function recordHistorySize(teamId: string, eventCount: number): void {
  workflowHistorySize.labels(teamId).observe(eventCount);
}

export function recordWaitingWorkflow(
  waitType: "approval" | "input",
  delta: 1 | -1
): void {
  waitingWorkflowsGauge.labels(waitType).inc(delta);
}

export function recordParallelBranch(
  status: "success" | "failure" | "skipped"
): void {
  parallelBranchesTotal.labels(status).inc();
}

export function recordLoopIteration(status: "success" | "failure"): void {
  loopIterationsTotal.labels(status).inc();
}

export function recordSubWorkflow(status: "success" | "failure"): void {
  subWorkflowsTotal.labels(status).inc();
}

export function recordApprovalResponseTime(
  outcome: "approved" | "rejected" | "timeout",
  durationMs: number
): void {
  approvalResponseTimeSeconds.labels(outcome).observe(durationMs / 1000);
}

export function recordInputResponseTime(
  outcome: "submitted" | "skipped" | "timeout",
  durationMs: number
): void {
  inputResponseTimeSeconds.labels(outcome).observe(durationMs / 1000);
}

export const runtimeEventEmissionTotal = new Counter({
  name: "canvas_runtime_event_emission_total",
  help: "Total runtime events emitted",
  labelNames: ["status", "payload_type"] as const,
  registers: [canvasMetricsRegistry],
});

export const runtimeEventEmissionDurationSeconds = new Histogram({
  name: "canvas_runtime_event_emission_duration_seconds",
  help: "Duration of runtime event emission stages in seconds",
  labelNames: ["stage"] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [canvasMetricsRegistry],
});

export const runtimeEventPersistFailuresTotal = new Counter({
  name: "canvas_runtime_event_persist_failures_total",
  help: "Total runtime event database persist failures",
  registers: [canvasMetricsRegistry],
});

export const runtimeEventPublishFailuresTotal = new Counter({
  name: "canvas_runtime_event_publish_failures_total",
  help: "Total runtime event Redis publish failures",
  registers: [canvasMetricsRegistry],
});

type RuntimeEventEmissionMetrics = {
  payloadType: string;
  status: "success" | "failure";
  persistMs: number;
  publishMs: number;
  totalMs: number;
};

export function recordRuntimeEventEmission(
  metrics: RuntimeEventEmissionMetrics
): void {
  runtimeEventEmissionTotal.labels(metrics.status, metrics.payloadType).inc();
  runtimeEventEmissionDurationSeconds
    .labels("persist")
    .observe(metrics.persistMs / 1000);
  runtimeEventEmissionDurationSeconds
    .labels("publish")
    .observe(metrics.publishMs / 1000);
  runtimeEventEmissionDurationSeconds
    .labels("total")
    .observe(metrics.totalMs / 1000);
}

export function recordRuntimeEventPersistFailure(): void {
  runtimeEventPersistFailuresTotal.inc();
}

export function recordRuntimeEventPublishFailure(): void {
  runtimeEventPublishFailuresTotal.inc();
}

export async function getCanvasMetrics(): Promise<string> {
  return await canvasMetricsRegistry.metrics();
}

export function getCanvasMetricsContentType(): string {
  return canvasMetricsRegistry.contentType;
}
