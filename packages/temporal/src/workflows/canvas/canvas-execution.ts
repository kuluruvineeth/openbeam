import {
  ApprovalNodeConfigSchema,
  ConditionNodeConfigSchema,
  type ExecutionPlan,
  type ExecutionPlanNode,
  type ExecutionStatus,
  type ExecutionTrace,
  InputNodeConfigSchema,
  LoopNodeConfigSchema,
  ParallelJoinNodeConfigSchema,
  type ParallelMapNodeConfig,
  ParallelMapNodeConfigSchema,
  ParallelSplitNodeConfigSchema,
  type RetryNodeConfig,
  RetryNodeConfigSchema,
  type StepExecution,
  SubWorkflowNodeConfigSchema,
  type TryCatchNodeConfig,
  TryCatchNodeConfigSchema,
} from "@openplane/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
  LoopIterationError,
  LoopState,
  ParallelJoinBranchResult,
} from "@openplane/types/temporal";
import {
  type AgentCanvasExecutionInput,
  AgentCanvasExecutionInputSchema,
  type AgentCanvasExecutionOutput,
} from "@openplane/types/temporal/workflows";
import {
  ApplicationFailure,
  condition,
  proxyActivities,
  setHandler,
  sleep,
  startChild,
  workflowInfo,
} from "@temporalio/workflow";

function getTimestamp(): number {
  return workflowInfo().unsafe.now();
}

import type { CanvasExecutionActivities } from "../../activities/canvas/types";
import { TASK_QUEUES } from "../../config/task-queues";
import {
  CanvasValidationError,
  compileCanvasPlan,
} from "../../engine/canvas-compiler";
import { isExecutionDataRef } from "../../engine/claim-check-utils";
import { generateWorkflowId } from "../../utils/workflow-id";
import {
  type CanvasExecutionQueryState,
  cancelSignal,
  canvasApprovalSignal,
  canvasExecutionQuery,
  canvasInputSignal,
  pauseSignal,
  resumeSignal,
} from "../types";

const SUPPORTED_NODE_TYPES = new Set([
  "start",
  "end",
  "transform",
  "filter",
  "condition",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "parallel_map",
  "try_catch",
  "template",
  "code",
  "notify",
  "approval",
  "input",
  "sub_workflow",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
  "agent_call",
  "llm",
  "audio",
  "video",
  "rag",
  "chunk",
  "merge",
  "summarize",
  "extract",
  "classify",
  "embeddings",
  "rerank",
  "image",
  "http_request",
  "database_query",
  "graphql_query",
  "connector",
  "connector_action",
  "tool",
  "memory_write",
  "memory_read",
  "memory_search",
]);
const ENTRY_NODE_TYPES = new Set([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);
const IGNORED_NODE_TYPES = new Set(["annotation"]);
const RETRY_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "end",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
]);
const TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "end",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
]);
const TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
]);
const PARALLEL_MAP_FORBIDDEN_TARGET_TYPES = new Set([
  "start",
  "end",
  "condition",
  "approval",
  "input",
  "sub_workflow",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
  "parallel_map",
]);

interface CanvasExecutionState {
  paused: boolean;
  cancelled: boolean;
}

const executeActivities = proxyActivities<
  Pick<
    CanvasExecutionActivities,
    | "executeCanvasNode"
    | "executeLoopNode"
    | "executeParallelSplitNode"
    | "executeParallelJoinNode"
    | "executeParallelMapNode"
    | "resolveParallelMapBatch"
    | "storeParallelMapOutput"
  >
>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "30m",
  heartbeatTimeout: "2m",
  retry: { maximumAttempts: 3 },
});

const executeNoRetryActivities = proxyActivities<
  Pick<CanvasExecutionActivities, "executeCanvasNode">
>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "10m",
  heartbeatTimeout: "2m",
  retry: { maximumAttempts: 1 },
});

const updateActivities = proxyActivities<
  Pick<CanvasExecutionActivities, "updateCanvasExecution">
>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "3m",
  retry: { maximumAttempts: 5 },
});

const stepActivities = proxyActivities<
  Pick<
    CanvasExecutionActivities,
    | "createCanvasExecutionStep"
    | "updateCanvasExecutionStep"
    | "createCanvasApproval"
  >
>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "3m",
  retry: { maximumAttempts: 5 },
});

const subWorkflowActivities = proxyActivities<
  Pick<
    CanvasExecutionActivities,
    "prepareSubWorkflowExecution" | "resolveSubWorkflowOutput"
  >
>({
  startToCloseTimeout: "2m",
  scheduleToCloseTimeout: "6m",
  retry: { maximumAttempts: 3 },
});

function getExecutableNodes(plan: ExecutionPlan): ExecutionPlanNode[] {
  return plan.nodes.filter((node) => !IGNORED_NODE_TYPES.has(node.type));
}

function buildNodeIndex(
  nodes: ExecutionPlanNode[]
): Map<string, ExecutionPlanNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function getExecutableEdges(plan: ExecutionPlan): ExecutionPlan["edges"] {
  const nodeIds = new Set(getExecutableNodes(plan).map((node) => node.id));

  return plan.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
}

function buildEdgeIndex(edges: ExecutionPlan["edges"]): {
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
} {
  const edgesBySource = new Map<string, ExecutionPlan["edges"]>();
  const edgesByTarget = new Map<string, ExecutionPlan["edges"]>();

  for (const edge of edges) {
    const outbound = edgesBySource.get(edge.source);
    if (outbound) {
      outbound.push(edge);
    } else {
      edgesBySource.set(edge.source, [edge]);
    }

    const inbound = edgesByTarget.get(edge.target);
    if (inbound) {
      inbound.push(edge);
    } else {
      edgesByTarget.set(edge.target, [edge]);
    }
  }

  return { edgesBySource, edgesByTarget };
}

function buildExecutionGraph(plan: ExecutionPlan): {
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
} {
  const nodes = getExecutableNodes(plan);
  const nodesById = buildNodeIndex(nodes);
  const edges = getExecutableEdges(plan);
  const { edgesBySource, edgesByTarget } = buildEdgeIndex(edges);

  return { nodesById, edgesBySource, edgesByTarget };
}

function buildAdjacency(
  nodeIds: Set<string>,
  edges: ExecutionPlan["edges"]
): {
  inbound: Map<string, Set<string>>;
  outbound: Map<string, Set<string>>;
} {
  const inbound = new Map<string, Set<string>>();
  const outbound = new Map<string, Set<string>>();

  for (const nodeId of nodeIds) {
    inbound.set(nodeId, new Set());
    outbound.set(nodeId, new Set());
  }

  for (const edge of edges) {
    const outboundSet = outbound.get(edge.source);
    const inboundSet = inbound.get(edge.target);

    if (outboundSet && inboundSet) {
      outboundSet.add(edge.target);
      inboundSet.add(edge.source);
    }
  }

  return { inbound, outbound };
}

function containsInvalidCycle(
  nodeIds: Set<string>,
  outbound: Map<string, Set<string>>,
  nodeTypes: Map<string, ExecutionPlanNode["type"]>
): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId);
      const cycleNodes = cycleStart >= 0 ? stack.slice(cycleStart) : [nodeId];
      const hasLoop = cycleNodes.some((id) => nodeTypes.get(id) === "loop");
      return !hasLoop;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    stack.push(nodeId);
    for (const next of outbound.get(nodeId) ?? []) {
      if (visit(next)) {
        return true;
      }
    }
    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of nodeIds) {
    if (visit(nodeId)) {
      return true;
    }
  }

  return false;
}

function resolveNodeConfig(data: unknown): unknown {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if ("config" in record) {
      return record.config;
    }
  }

  return data;
}

function isRetryTargetType(type: ExecutionPlanNode["type"]): boolean {
  return !RETRY_FORBIDDEN_TARGET_TYPES.has(type);
}

function isTryCatchTryTargetType(type: ExecutionPlanNode["type"]): boolean {
  return !TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES.has(type);
}

function isTryCatchCatchTargetType(type: ExecutionPlanNode["type"]): boolean {
  return !TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES.has(type);
}

function isParallelMapTargetType(type: ExecutionPlanNode["type"]): boolean {
  return !PARALLEL_MAP_FORBIDDEN_TARGET_TYPES.has(type);
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash = (hash * 31 + code) % 2_147_483_647;
  }
  return hash;
}

function resolveJitterMs(seed: string, jitterMs: number): number {
  if (jitterMs <= 0) {
    return 0;
  }
  return hashSeed(seed) % (jitterMs + 1);
}

function resolveRetryDelayMs(params: {
  attempt: number;
  config: RetryNodeConfig;
  seed: string;
}): number {
  const base =
    params.config.backoffMs *
    (params.config.exponential ? 2 ** (params.attempt - 1) : 1);
  const jitter =
    params.config.jitterMs !== undefined
      ? resolveJitterMs(params.seed, params.config.jitterMs)
      : 0;
  return base + jitter;
}

function unwrapFailure(error: unknown): unknown {
  let current: unknown = error;
  const visited = new Set<unknown>();

  while (
    current &&
    typeof current === "object" &&
    "cause" in current &&
    !visited.has(current)
  ) {
    visited.add(current);
    const next = (current as { cause?: unknown }).cause;
    if (!next) {
      break;
    }
    current = next;
  }

  return current;
}

function resolveFailureDetails(error: unknown): {
  type?: string;
  name?: string;
  nonRetryable?: boolean;
} {
  const root = unwrapFailure(error);

  if (root instanceof ApplicationFailure) {
    return {
      type: root.type ?? root.name,
      name: root.name,
      nonRetryable: root.nonRetryable ?? undefined,
    };
  }

  if (error instanceof ApplicationFailure) {
    return {
      type: error.type ?? error.name,
      name: error.name,
      nonRetryable: error.nonRetryable ?? undefined,
    };
  }

  if (root instanceof Error) {
    return { name: root.name };
  }

  if (error instanceof Error) {
    return { name: error.name };
  }

  return {};
}

function resolveFailureMessage(error: unknown): string {
  const root = unwrapFailure(error);
  if (root instanceof Error) {
    return root.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function shouldRetryFailure(error: unknown, config: RetryNodeConfig): boolean {
  const details = resolveFailureDetails(error);
  if (details.type === "UnsupportedNodeType") {
    return false;
  }
  if (details.type === "CanvasExecutionPlanError") {
    return false;
  }

  const allowlist = config.retryOnErrors?.filter((value) => value.trim());
  if (allowlist && allowlist.length > 0) {
    if (details.type && allowlist.includes(details.type)) {
      return true;
    }
    if (details.name && allowlist.includes(details.name)) {
      return true;
    }
    return false;
  }

  if (details.nonRetryable && details.type !== "CanvasNodeExecutionError") {
    return false;
  }

  return true;
}

function shouldCatchFailure(
  error: unknown,
  config: TryCatchNodeConfig
): boolean {
  const details = resolveFailureDetails(error);
  const allowlist = config.catchErrors?.filter((value) => value.trim());

  if (allowlist && allowlist.length > 0) {
    if (details.type && allowlist.includes(details.type)) {
      return true;
    }
    if (details.name && allowlist.includes(details.name)) {
      return true;
    }
    return !config.rethrowUnhandled;
  }

  return true;
}

type ParallelMapItemResult =
  | { status: "fulfilled"; index: number; item: unknown; output: unknown }
  | { status: "rejected"; index: number; item: unknown; error: string };

type ParallelMapTaskDetails = {
  error: unknown;
  item: unknown;
  index: number;
  input: Record<string, unknown>;
  startedAt: number;
};

class ParallelMapTaskError extends Error {
  readonly details: ParallelMapTaskDetails;

  constructor(details: ParallelMapTaskDetails) {
    super(resolveFailureMessage(details.error));
    this.name = "ParallelMapTaskError";
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildParallelMapItemInput(params: {
  input: unknown;
  item: unknown;
  index: number;
  config: ParallelMapNodeConfig;
}): Record<string, unknown> {
  const itemKey = params.config.itemVariable?.trim() || "item";
  const indexKey = params.config.indexVariable?.trim() || "index";

  return {
    [itemKey]: params.item,
    [indexKey]: params.index,
    input: params.input,
  };
}

function mergeRecordValue(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (isRecord(existing) && isRecord(value)) {
      target[key] = mergeRecordValue({ ...existing }, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function aggregateParallelMapResults(params: {
  entries: ParallelMapItemResult[];
  mode: ParallelMapNodeConfig["aggregationMode"];
  continueOnError: boolean;
}): unknown {
  const errors = params.entries
    .filter(
      (
        entry
      ): entry is Extract<ParallelMapItemResult, { status: "rejected" }> =>
        entry.status === "rejected"
    )
    .map((entry) => ({
      index: entry.index,
      item: entry.item,
      error: entry.error,
    }));

  switch (params.mode) {
    case "array":
      return params.entries;
    case "object": {
      const result: Record<string, unknown> = {};
      for (const entry of params.entries) {
        const key = String(entry.index);
        result[key] =
          entry.status === "fulfilled"
            ? entry.output
            : { error: entry.error, item: entry.item };
      }
      return result;
    }
    case "merge": {
      let merged: Record<string, unknown> = {};
      for (const entry of params.entries) {
        if (entry.status !== "fulfilled") {
          continue;
        }
        if (isRecord(entry.output)) {
          merged = mergeRecordValue(merged, entry.output);
        } else {
          merged[String(entry.index)] = entry.output;
        }
      }
      if (params.continueOnError && errors.length > 0) {
        return { result: merged, errors };
      }
      return merged;
    }
    case "custom":
      return { results: params.entries, errors };
    default:
      return params.entries;
  }
}

function conditionHandles(config: {
  branches: Array<{ id: string }>;
  defaultBranchLabel?: string;
}): Set<string> {
  if (config.branches.length === 0) {
    return new Set(["true", "false"]);
  }

  const handles = new Set(config.branches.map((branch) => branch.id));
  if (config.defaultBranchLabel?.trim()) {
    handles.add("default");
  }

  return handles;
}

function validateConditionNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound === 0) {
    issues.push("Condition node must have 1 inbound and at least 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const configResult = ConditionNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Condition node ${node.id} has invalid config`);
    return;
  }

  const allowedHandles = conditionHandles(configResult.data);

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Condition node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Condition node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (!allowedHandles.has(handle)) {
      issues.push(`Condition node ${node.id} has unknown handle ${handle}`);
    }
  }
}

function validateApprovalNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound === 0) {
    issues.push("Approval node must have 1 inbound and 2 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const configResult = ApprovalNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Approval node ${node.id} has invalid config`);
    return;
  }

  const config = configResult.data;

  if (config.approvalType !== "single") {
    issues.push(
      `Approval node ${node.id} uses unsupported approval type ${config.approvalType}`
    );
  }

  if (config.requiredApprovals !== 1) {
    issues.push(
      `Approval node ${node.id} requires unsupported approval count ${config.requiredApprovals}`
    );
  }

  if (
    config.allowedActions.some(
      (action) => action !== "approve" && action !== "reject"
    )
  ) {
    issues.push(`Approval node ${node.id} has unsupported actions`);
  }

  if (config.timeoutAction === "escalate") {
    issues.push(
      `Approval node ${node.id} uses unsupported timeout action ${config.timeoutAction}`
    );
  }

  if (config.autoApprove) {
    issues.push(`Approval node ${node.id} does not support auto-approve`);
  }

  if (config.escalation?.enabled) {
    issues.push(`Approval node ${node.id} does not support escalation`);
  }

  if (config.notification) {
    issues.push(`Approval node ${node.id} does not support notifications`);
  }

  if (outboundEdges.length < 2) {
    issues.push(
      `Approval node ${node.id} requires approved and rejected edges`
    );
  }

  const allowedHandles = new Set(["approved", "rejected"]);

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Approval node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Approval node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (!allowedHandles.has(handle)) {
      issues.push(`Approval node ${node.id} has unknown handle ${handle}`);
    }
  }

  if (!(handles.has("approved") && handles.has("rejected"))) {
    issues.push(
      `Approval node ${node.id} must define approved and rejected handles`
    );
  }
}

function validateInputNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound === 0) {
    issues.push("Input node must have 1 inbound and at least 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const configResult = InputNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Input node ${node.id} has invalid config`);
    return;
  }

  const config = configResult.data;
  const fieldIds = new Set<string>();
  const hasTimeout = (config.timeoutMs ?? 0) > 0;

  for (const field of config.fields) {
    if (fieldIds.has(field.id)) {
      issues.push(`Input node ${node.id} has duplicate field id ${field.id}`);
    } else {
      fieldIds.add(field.id);
    }
  }

  if (hasTimeout && !config.allowSkip && config.timeoutAction === "skip") {
    issues.push(
      `Input node ${node.id} timeoutAction skip requires allowSkip true`
    );
  }

  if (hasTimeout && config.timeoutAction === "default") {
    const missingDefaults = config.fields.filter(
      (field) => field.validation?.required && field.defaultValue === undefined
    );
    if (missingDefaults.length > 0) {
      issues.push(
        `Input node ${node.id} default timeout requires defaults for required fields`
      );
    }
  }

  if (config.allowSkip) {
    if (outboundEdges.length < 2) {
      issues.push(`Input node ${node.id} requires data and skipped edges`);
    }

    const allowedHandles = new Set(["data", "skipped"]);

    for (const edge of outboundEdges) {
      const handle = edge.sourceHandle ?? undefined;
      if (!handle) {
        issues.push(`Input node ${node.id} has edge without handle`);
        continue;
      }
      if (handles.has(handle)) {
        issues.push(`Input node ${node.id} has duplicate handle ${handle}`);
        continue;
      }
      handles.add(handle);
      if (!allowedHandles.has(handle)) {
        issues.push(`Input node ${node.id} has unknown handle ${handle}`);
      }
    }

    if (!(handles.has("data") && handles.has("skipped"))) {
      issues.push(`Input node ${node.id} must define data and skipped handles`);
    }
    return;
  }

  if (outboundEdges.length !== 1) {
    issues.push(`Input node ${node.id} must have 1 outbound edge`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (handle && handle !== "data") {
      issues.push(`Input node ${node.id} has unknown handle ${handle}`);
    }
  }
}

function validateSubWorkflowNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  issues: string[];
}): void {
  const { node, inbound, outbound, issues } = params;

  if (inbound !== 1 || outbound !== 1) {
    issues.push(
      `Sub-workflow node ${node.id} must have 1 inbound and 1 outbound`
    );
    return;
  }

  const configResult = SubWorkflowNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Sub-workflow node ${node.id} has invalid config`);
    return;
  }

  const config = configResult.data;

  if (!config.workflowId.trim()) {
    issues.push(`Sub-workflow node ${node.id} is missing workflow ID`);
  }

  if (config.retryOnFailure) {
    issues.push(`Sub-workflow node ${node.id} does not support retries`);
  }

  if (config.inputMode === "fields") {
    const mappings = config.inputMappings ?? {};
    if (Object.keys(mappings).length === 0) {
      issues.push(`Sub-workflow node ${node.id} requires input mappings`);
    }
  }

  if (!config.waitForCompletion) {
    if (config.timeoutMs) {
      issues.push(`Sub-workflow node ${node.id} timeout requires wait`);
    }
    if (
      config.outputMappings &&
      Object.keys(config.outputMappings).length > 0
    ) {
      issues.push(`Sub-workflow node ${node.id} output mappings require wait`);
    }
  }
}

function validateLoopNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound === 0 || outbound === 0) {
    issues.push("Loop node must have at least 1 inbound and 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const allowedHandles = new Set(["body", "done"]);
  const configResult = LoopNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Loop node ${node.id} has invalid config`);
    return;
  }

  const config = configResult.data;

  if (config.executionMode !== "sequential") {
    issues.push(
      `Loop node ${node.id} uses unsupported execution mode ${config.executionMode}`
    );
  }

  if (config.type === "forEach" && !config.collection?.trim()) {
    issues.push(`Loop node ${node.id} is missing collection expression`);
  }

  if (config.type === "while" && !config.condition?.trim()) {
    issues.push(`Loop node ${node.id} is missing condition expression`);
  }

  if (config.type === "times" && !(config.times && config.times > 0)) {
    issues.push(`Loop node ${node.id} is missing iteration count`);
  }

  if (
    config.outputMode === "aggregate" &&
    !config.aggregateExpression?.trim()
  ) {
    issues.push(`Loop node ${node.id} is missing aggregation expression`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Loop node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Loop node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (!allowedHandles.has(handle)) {
      issues.push(`Loop node ${node.id} has unknown handle ${handle}`);
    }
  }

  if (!(handles.has("body") && handles.has("done"))) {
    issues.push(`Loop node ${node.id} must have body and done branches`);
  }
}

type ParallelSplitPlan = {
  splitNodeId: string;
  joinNodeId: string;
  branches: Array<{
    branchId: string;
    startNodeId: string;
    joinInputId: string;
  }>;
};

type ParallelMapPlan = {
  mapNodeId: string;
  targetNodeId: string;
  nextNodeId: string | null;
};

function validateParallelSplitNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound < 2) {
    issues.push("Parallel split must have 1 inbound and at least 2 outbound");
    return;
  }

  const configResult = ParallelSplitNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Parallel split node ${node.id} has invalid config`);
    return;
  }

  const branchIds = configResult.data.branches.map((branch) => branch.id);
  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();

  if (outboundEdges.length !== branchIds.length) {
    issues.push(`Parallel split node ${node.id} has missing branch edges`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Parallel split node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(
        `Parallel split node ${node.id} has duplicate handle ${handle}`
      );
      continue;
    }
    handles.add(handle);
    if (!branchIds.includes(handle)) {
      issues.push(
        `Parallel split node ${node.id} has unknown handle ${handle}`
      );
    }
  }

  for (const branchId of branchIds) {
    if (!handles.has(branchId)) {
      issues.push(
        `Parallel split node ${node.id} missing branch handle ${branchId}`
      );
    }
  }

  if (
    configResult.data.dataDistribution === "partition" &&
    !configResult.data.partitionKey?.trim()
  ) {
    issues.push(`Parallel split node ${node.id} requires partition key`);
  }
}

function validateParallelJoinNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesByTarget, issues } = params;

  if (inbound < 2 || outbound !== 1) {
    issues.push("Parallel join must have at least 2 inbound and 1 outbound");
    return;
  }

  const configResult = ParallelJoinNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Parallel join node ${node.id} has invalid config`);
    return;
  }

  const inputIds = configResult.data.inputs.map((input) => input.id);
  const inboundEdges = edgesByTarget.get(node.id) ?? [];
  const handles = new Set<string>();

  if (inboundEdges.length !== inputIds.length) {
    issues.push(`Parallel join node ${node.id} has missing input edges`);
  }

  for (const edge of inboundEdges) {
    const handle = edge.targetHandle ?? undefined;
    if (!handle) {
      issues.push(`Parallel join node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(
        `Parallel join node ${node.id} has duplicate handle ${handle}`
      );
      continue;
    }
    handles.add(handle);
    if (!inputIds.includes(handle)) {
      issues.push(`Parallel join node ${node.id} has unknown handle ${handle}`);
    }
  }

  for (const inputId of inputIds) {
    if (!handles.has(inputId)) {
      issues.push(`Parallel join node ${node.id} missing input ${inputId}`);
    }
  }
}

function validateRetryNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  nodesById: Map<string, ExecutionPlanNode>;
  adjacency: {
    inbound: Map<string, Set<string>>;
    outbound: Map<string, Set<string>>;
  };
  issues: string[];
}): void {
  const {
    node,
    inbound,
    outbound,
    edgesBySource,
    nodesById,
    adjacency,
    issues,
  } = params;

  if (inbound !== 1 || outbound !== 1) {
    issues.push("Retry node must have 1 inbound and 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  if (outboundEdges.length !== 1) {
    issues.push(`Retry node ${node.id} must have a single outbound edge`);
    return;
  }

  const targetId = outboundEdges[0]?.target;
  if (!targetId) {
    issues.push(`Retry node ${node.id} is missing target node`);
    return;
  }

  const targetNode = nodesById.get(targetId);
  if (!targetNode) {
    issues.push(`Retry node ${node.id} targets unknown node ${targetId}`);
    return;
  }

  if (!isRetryTargetType(targetNode.type)) {
    issues.push(
      `Retry node ${node.id} targets unsupported node type ${targetNode.type}`
    );
    return;
  }

  const targetInbound = adjacency.inbound.get(targetId)?.size ?? 0;
  if (targetInbound !== 1) {
    issues.push(`Retry target ${targetId} must have 1 inbound`);
  }

  const targetOutbound = adjacency.outbound.get(targetId)?.size ?? 0;
  if (targetOutbound !== 1) {
    issues.push(`Retry target ${targetId} must have 1 outbound`);
  }
}

function validateTryCatchNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  nodesById: Map<string, ExecutionPlanNode>;
  adjacency: {
    inbound: Map<string, Set<string>>;
    outbound: Map<string, Set<string>>;
  };
  issues: string[];
}): void {
  const {
    node,
    inbound,
    outbound,
    edgesBySource,
    nodesById,
    adjacency,
    issues,
  } = params;

  if (inbound !== 1 || outbound !== 2) {
    issues.push("Try/catch node must have 1 inbound and 2 outbound");
    return;
  }

  const configResult = TryCatchNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Try/catch node ${node.id} has invalid config`);
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  let tryEdge: ExecutionPlan["edges"][number] | undefined;
  let catchEdge: ExecutionPlan["edges"][number] | undefined;

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Try/catch node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Try/catch node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (handle === "try") {
      tryEdge = edge;
      continue;
    }
    if (handle === "catch") {
      catchEdge = edge;
      continue;
    }
    issues.push(`Try/catch node ${node.id} has unknown handle ${handle}`);
  }

  if (!tryEdge) {
    issues.push(`Try/catch node ${node.id} missing try branch`);
  }
  if (!catchEdge) {
    issues.push(`Try/catch node ${node.id} missing catch branch`);
  }

  if (!(tryEdge && catchEdge)) {
    return;
  }

  const tryNode = nodesById.get(tryEdge.target);
  const catchNode = nodesById.get(catchEdge.target);

  if (!tryNode) {
    issues.push(`Try/catch node ${node.id} has unknown try target`);
    return;
  }

  if (!catchNode) {
    issues.push(`Try/catch node ${node.id} has unknown catch target`);
    return;
  }

  if (tryNode.id === catchNode.id) {
    issues.push(`Try/catch node ${node.id} must not reuse the same target`);
  }

  if (!isTryCatchTryTargetType(tryNode.type)) {
    issues.push(
      `Try/catch node ${node.id} has unsupported try target ${tryNode.type}`
    );
  }

  if (!isTryCatchCatchTargetType(catchNode.type)) {
    issues.push(
      `Try/catch node ${node.id} has unsupported catch target ${catchNode.type}`
    );
  }

  const tryInbound = adjacency.inbound.get(tryNode.id)?.size ?? 0;
  const tryOutbound = adjacency.outbound.get(tryNode.id)?.size ?? 0;
  if (tryInbound !== 1 || tryOutbound !== 1) {
    issues.push(
      `Try node ${tryNode.id} must have 1 inbound and 1 outbound edge`
    );
  }

  const catchInbound = adjacency.inbound.get(catchNode.id)?.size ?? 0;
  const catchOutbound = adjacency.outbound.get(catchNode.id)?.size ?? 0;
  if (catchInbound !== 1) {
    issues.push(`Catch node ${catchNode.id} must have 1 inbound edge`);
  }
  if (catchNode.type === "end") {
    if (catchOutbound !== 0) {
      issues.push(`Catch end node ${catchNode.id} must have 0 outbound edges`);
    }
  } else if (catchOutbound !== 1) {
    issues.push(`Catch node ${catchNode.id} must have 1 outbound edge`);
  }
}

function validateParallelMapNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  nodesById: Map<string, ExecutionPlanNode>;
  adjacency: {
    inbound: Map<string, Set<string>>;
    outbound: Map<string, Set<string>>;
  };
  issues: string[];
}): void {
  const {
    node,
    inbound,
    outbound,
    edgesBySource,
    nodesById,
    adjacency,
    issues,
  } = params;

  if (inbound !== 1 || outbound !== 1) {
    issues.push("Parallel map node must have 1 inbound and 1 outbound");
    return;
  }

  const configResult = ParallelMapNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Parallel map node ${node.id} has invalid config`);
    return;
  }

  if (!configResult.data.collection.trim()) {
    issues.push(`Parallel map node ${node.id} requires collection expression`);
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  if (outboundEdges.length !== 1) {
    issues.push(
      `Parallel map node ${node.id} must have a single outbound edge`
    );
    return;
  }

  const targetId = outboundEdges[0]?.target;
  if (!targetId) {
    issues.push(`Parallel map node ${node.id} is missing target node`);
    return;
  }

  const targetNode = nodesById.get(targetId);
  if (!targetNode) {
    issues.push(
      `Parallel map node ${node.id} targets unknown node ${targetId}`
    );
    return;
  }

  if (!isParallelMapTargetType(targetNode.type)) {
    issues.push(
      `Parallel map node ${node.id} targets unsupported node type ${targetNode.type}`
    );
  }

  const targetInbound = adjacency.inbound.get(targetId)?.size ?? 0;
  if (targetInbound !== 1) {
    issues.push(`Parallel map target ${targetId} must have 1 inbound`);
  }

  const targetOutbound = adjacency.outbound.get(targetId)?.size ?? 0;
  if (targetOutbound !== 1) {
    issues.push(`Parallel map target ${targetId} must have 1 outbound`);
  }
}

function collectReachableNodes(
  startNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): Set<string> {
  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const edges = edgesBySource.get(current) ?? [];
    for (const edge of edges) {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return visited;
}

function findClosestJoinIds(
  startNodeId: string,
  nodesById: Map<string, ExecutionPlanNode>,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): Set<string> {
  const queue: Array<{ id: string; depth: number }> = [
    { id: startNodeId, depth: 0 },
  ];
  const visited = new Set<string>();
  const joinIds = new Set<string>();
  let minDepth = Number.POSITIVE_INFINITY;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) {
      continue;
    }
    if (current.depth > minDepth) {
      continue;
    }
    visited.add(current.id);
    const node = nodesById.get(current.id);
    if (!node) {
      continue;
    }
    if (node.type === "parallel_join") {
      if (current.depth < minDepth) {
        minDepth = current.depth;
        joinIds.clear();
      }
      if (current.depth === minDepth) {
        joinIds.add(node.id);
      }
      continue;
    }
    const edges = edgesBySource.get(current.id) ?? [];
    for (const edge of edges) {
      if (!visited.has(edge.target)) {
        queue.push({ id: edge.target, depth: current.depth + 1 });
      }
    }
  }

  return joinIds;
}

function resolveParallelSplitPlan(params: {
  splitNode: ExecutionPlanNode;
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
}): ParallelSplitPlan {
  const { splitNode, nodesById, edgesBySource, edgesByTarget } = params;
  const splitConfigResult = ParallelSplitNodeConfigSchema.safeParse(
    resolveNodeConfig(splitNode.data)
  );

  if (!splitConfigResult.success) {
    throw new Error(`Parallel split node ${splitNode.id} has invalid config`);
  }

  const branchIds = splitConfigResult.data.branches.map((branch) => branch.id);
  const outboundEdges = edgesBySource.get(splitNode.id) ?? [];
  const edgeByHandle = new Map<string, ExecutionPlan["edges"][number]>();

  if (outboundEdges.length !== branchIds.length) {
    throw new Error(`Parallel split node ${splitNode.id} has missing branches`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      throw new Error(`Parallel split node ${splitNode.id} has missing handle`);
    }
    if (edgeByHandle.has(handle)) {
      throw new Error(
        `Parallel split node ${splitNode.id} has duplicate handle`
      );
    }
    edgeByHandle.set(handle, edge);
  }

  for (const branchId of branchIds) {
    if (!edgeByHandle.has(branchId)) {
      throw new Error(
        `Parallel split node ${splitNode.id} missing branch ${branchId}`
      );
    }
  }

  const branchStarts = branchIds.map((branchId) => {
    const startEdge = edgeByHandle.get(branchId);
    if (!startEdge) {
      throw new Error(
        `Parallel split node ${splitNode.id} missing branch ${branchId}`
      );
    }
    return {
      branchId,
      startNodeId: startEdge.target,
    };
  });

  const joinSets = branchStarts.map((branch) =>
    findClosestJoinIds(branch.startNodeId, nodesById, edgesBySource)
  );

  if (joinSets.some((set) => set.size === 0)) {
    throw new Error(`Parallel split node ${splitNode.id} missing join node`);
  }

  let intersection = new Set(joinSets[0]);
  for (let i = 1; i < joinSets.length; i += 1) {
    const next = joinSets[i];
    if (!next) {
      throw new Error(`Parallel split node ${splitNode.id} has invalid join`);
    }
    intersection = new Set([...intersection].filter((id) => next.has(id)));
  }

  if (intersection.size !== 1) {
    throw new Error(`Parallel split node ${splitNode.id} has ambiguous join`);
  }

  const [joinNodeId] = Array.from(intersection);
  if (!joinNodeId) {
    throw new Error(`Parallel split node ${splitNode.id} has invalid join`);
  }
  const joinNode = nodesById.get(joinNodeId);

  if (!joinNode || joinNode.type !== "parallel_join") {
    throw new Error(`Parallel split node ${splitNode.id} has invalid join`);
  }

  const joinConfigResult = ParallelJoinNodeConfigSchema.safeParse(
    resolveNodeConfig(joinNode.data)
  );

  if (!joinConfigResult.success) {
    throw new Error(`Parallel join node ${joinNode.id} has invalid config`);
  }

  const joinInputIds = joinConfigResult.data.inputs.map((input) => input.id);
  const inboundEdges = edgesByTarget.get(joinNodeId) ?? [];

  if (inboundEdges.length !== joinInputIds.length) {
    throw new Error(`Parallel join node ${joinNode.id} missing inputs`);
  }

  const joinInputs = new Set<string>();
  for (const edge of inboundEdges) {
    const handle = edge.targetHandle ?? undefined;
    if (!handle) {
      throw new Error(`Parallel join node ${joinNode.id} has missing handle`);
    }
    if (joinInputs.has(handle)) {
      throw new Error(`Parallel join node ${joinNode.id} has duplicate handle`);
    }
    if (!joinInputIds.includes(handle)) {
      throw new Error(`Parallel join node ${joinNode.id} has unknown handle`);
    }
    joinInputs.add(handle);
  }

  const reachableByBranch = new Map<string, Set<string>>();
  for (const branch of branchStarts) {
    reachableByBranch.set(
      branch.branchId,
      collectReachableNodes(branch.startNodeId, edgesBySource)
    );
  }

  const branchToJoinInput = new Map<string, string>();
  const usedInputs = new Set<string>();
  for (const edge of inboundEdges) {
    const joinInput = edge.targetHandle ?? "";
    const matchingBranches = branchStarts.filter((branch) =>
      reachableByBranch.get(branch.branchId)?.has(edge.source)
    );

    if (matchingBranches.length !== 1) {
      throw new Error(`Parallel join node ${joinNode.id} has invalid branch`);
    }

    const branchEntry = matchingBranches[0];
    if (!branchEntry) {
      throw new Error(`Parallel join node ${joinNode.id} has invalid branch`);
    }
    const branchId = branchEntry.branchId;
    const existing = branchToJoinInput.get(branchId);

    if (existing && existing !== joinInput) {
      throw new Error(
        `Parallel join node ${joinNode.id} has conflicting branch inputs`
      );
    }

    if (!existing) {
      if (usedInputs.has(joinInput)) {
        throw new Error(
          `Parallel join node ${joinNode.id} has duplicate input ${joinInput}`
        );
      }
      branchToJoinInput.set(branchId, joinInput);
      usedInputs.add(joinInput);
    }
  }

  if (branchToJoinInput.size !== branchIds.length) {
    throw new Error(`Parallel join node ${joinNode.id} missing branch input`);
  }

  return {
    splitNodeId: splitNode.id,
    joinNodeId,
    branches: branchStarts.map((branch) => {
      const joinInputId = branchToJoinInput.get(branch.branchId);
      if (!joinInputId) {
        throw new Error(`Parallel join node ${joinNode.id} missing input`);
      }
      return {
        branchId: branch.branchId,
        startNodeId: branch.startNodeId,
        joinInputId,
      };
    }),
  };
}

function resolveParallelMapPlan(params: {
  mapNode: ExecutionPlanNode;
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
}): ParallelMapPlan {
  const { mapNode, nodesById, edgesBySource } = params;
  const outboundEdges = edgesBySource.get(mapNode.id) ?? [];

  if (outboundEdges.length !== 1) {
    throw new Error(
      `Parallel map node ${mapNode.id} must have 1 outbound edge`
    );
  }

  const targetId = outboundEdges[0]?.target;
  if (!targetId) {
    throw new Error(`Parallel map node ${mapNode.id} missing target node`);
  }

  const targetNode = nodesById.get(targetId);
  if (!targetNode) {
    throw new Error(`Parallel map node ${mapNode.id} target not found`);
  }

  const nextNodeId = resolveNextEdge({
    node: targetNode,
    edgesBySource,
    branchId: null,
  }).nextNodeId;

  return {
    mapNodeId: mapNode.id,
    targetNodeId: targetNode.id,
    nextNodeId,
  };
}

function enforceExecutionPlan(plan: ExecutionPlan): void {
  const nodes = getExecutableNodes(plan);
  const edges = getExecutableEdges(plan);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodesById = buildNodeIndex(nodes);
  const nodeTypes = new Map(nodes.map((node) => [node.id, node.type]));
  const adjacency = buildAdjacency(nodeIds, edges);
  const startNodes = nodes.filter((node) => ENTRY_NODE_TYPES.has(node.type));
  const endNodes = nodes.filter((node) => node.type === "end");
  const { edgesBySource, edgesByTarget } = buildEdgeIndex(edges);
  const issues: string[] = [];

  if (startNodes.length !== 1) {
    issues.push("Execution requires exactly one start or trigger node");
  }

  if (endNodes.length === 0) {
    issues.push("Execution requires at least one end node");
  }

  if (containsInvalidCycle(nodeIds, adjacency.outbound, nodeTypes)) {
    issues.push("Execution graph contains an unsupported cycle");
  }

  for (const node of nodes) {
    const inbound = adjacency.inbound.get(node.id)?.size ?? 0;
    const outbound = adjacency.outbound.get(node.id)?.size ?? 0;

    if (ENTRY_NODE_TYPES.has(node.type)) {
      if (inbound !== 0 || outbound !== 1) {
        issues.push("Start or trigger node must have 0 inbound and 1 outbound");
      }
      continue;
    }

    if (node.type === "end") {
      if (outbound !== 0 || inbound === 0) {
        issues.push("End node must have at least 1 inbound and 0 outbound");
      }
      continue;
    }

    if (node.type === "condition") {
      validateConditionNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "approval") {
      validateApprovalNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "input") {
      validateInputNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "sub_workflow") {
      validateSubWorkflowNode({
        node,
        inbound,
        outbound,
        issues,
      });
      continue;
    }

    if (node.type === "loop") {
      validateLoopNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "parallel_split") {
      validateParallelSplitNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "parallel_join") {
      validateParallelJoinNode({
        node,
        inbound,
        outbound,
        edgesByTarget,
        issues,
      });
      continue;
    }

    if (node.type === "retry") {
      validateRetryNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        nodesById,
        adjacency,
        issues,
      });
      continue;
    }

    if (node.type === "try_catch") {
      validateTryCatchNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        nodesById,
        adjacency,
        issues,
      });
      continue;
    }

    if (node.type === "parallel_map") {
      validateParallelMapNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        nodesById,
        adjacency,
        issues,
      });
      continue;
    }

    if (inbound !== 1 || outbound !== 1) {
      issues.push(`Node ${node.id} must have 1 inbound and 1 outbound`);
    }
  }

  for (const node of nodes) {
    if (node.type !== "parallel_split") {
      continue;
    }

    try {
      resolveParallelSplitPlan({
        splitNode: node,
        nodesById,
        edgesBySource,
        edgesByTarget,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(message);
    }
  }

  for (const node of nodes) {
    if (node.type !== "parallel_map") {
      continue;
    }

    try {
      resolveParallelMapPlan({
        mapNode: node,
        nodesById,
        edgesBySource,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(message);
    }
  }

  if (issues.length > 0) {
    throw ApplicationFailure.nonRetryable(
      issues.join("; "),
      "CanvasExecutionPlanError"
    );
  }
}

function ensureSupportedNodes(plan: ExecutionPlan): void {
  const unsupported = getExecutableNodes(plan)
    .filter((node) => !SUPPORTED_NODE_TYPES.has(node.type))
    .map((node) => node.type);

  if (unsupported.length > 0) {
    throw ApplicationFailure.nonRetryable(
      `Unsupported node types: ${[...new Set(unsupported)].join(", ")}`,
      "UnsupportedNodeType"
    );
  }
}

function createInitialTrace(
  input: {
    executionId: string;
    agentCanvasId: string;
  },
  startedAt: number
): ExecutionTrace {
  return {
    id: input.executionId,
    agentCanvasId: input.agentCanvasId,
    status: "RUNNING",
    steps: [],
    startedAt,
  };
}

function buildStepInput(
  input: unknown,
  inputRef: StepExecution["inputRef"]
): { input?: unknown; inputRef?: StepExecution["inputRef"] } {
  if (inputRef) {
    return { inputRef };
  }

  if (input !== undefined && !isExecutionDataRef(input)) {
    return { input };
  }

  return {};
}

function buildCompletedStep(
  node: ExecutionPlanNode,
  input: unknown,
  result: {
    output?: unknown;
    outputRef?: StepExecution["outputRef"];
    inputRef?: StepExecution["inputRef"];
    startedAt: number;
    completedAt: number;
    latencyMs: number;
  }
): StepExecution {
  return {
    nodeId: node.id,
    nodeType: node.type,
    status: "COMPLETED",
    ...buildStepInput(input, result.inputRef),
    output: result.outputRef ? undefined : result.output,
    outputRef: result.outputRef,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    latencyMs: result.latencyMs,
  };
}

function buildFailedStep(params: {
  node: ExecutionPlanNode;
  input: unknown;
  error: string;
  startedAt: number;
  completedAt: number;
}): StepExecution {
  const inputRef = isExecutionDataRef(params.input) ? params.input : undefined;

  return {
    nodeId: params.node.id,
    nodeType: params.node.type,
    status: "FAILED",
    ...buildStepInput(params.input, inputRef),
    error: params.error,
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    latencyMs: params.completedAt - params.startedAt,
  };
}

function buildWaitingStep(params: {
  node: ExecutionPlanNode;
  input: unknown;
  inputRef: StepExecution["inputRef"];
  status: ExecutionStatus;
  startedAt: number;
}): StepExecution {
  return {
    nodeId: params.node.id,
    nodeType: params.node.type,
    status: params.status,
    ...buildStepInput(params.input, params.inputRef),
    startedAt: params.startedAt,
  };
}

function updateTraceForInput(trace: ExecutionTrace, step: StepExecution): void {
  if (trace.inputRef || trace.input !== undefined) {
    return;
  }

  if (step.inputRef) {
    trace.inputRef = step.inputRef;
    trace.input = undefined;
    return;
  }

  if (step.input !== undefined) {
    trace.input = step.input;
  }
}

function updateTraceForOutput(
  trace: ExecutionTrace,
  step: StepExecution
): void {
  if (step.outputRef) {
    trace.outputRef = step.outputRef;
    trace.output = undefined;
    return;
  }

  if (step.output !== undefined) {
    trace.output = step.output;
    trace.outputRef = undefined;
  }
}

function extractBranchId(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    const branchId = record.branchId;
    if (typeof branchId === "string") {
      return branchId;
    }
  }

  return null;
}

function resolveNextEdge(params: {
  node: ExecutionPlanNode;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  branchId: string | null;
}): { nextNodeId: string | null; edge?: ExecutionPlan["edges"][number] } {
  const { node, edgesBySource, branchId } = params;
  const outboundEdges = edgesBySource.get(node.id) ?? [];

  if (node.type === "end") {
    return { nextNodeId: null };
  }

  if (outboundEdges.length === 0) {
    throw ApplicationFailure.nonRetryable(
      `${node.type} node ${node.id} has no outbound edges`,
      "CanvasExecutionPlanError"
    );
  }

  if (node.type === "condition") {
    if (branchId) {
      const matches = outboundEdges.filter(
        (edge) => edge.sourceHandle === branchId
      );

      if (matches.length === 1) {
        return { nextNodeId: matches[0]?.target ?? null, edge: matches[0] };
      }

      if (matches.length > 1) {
        throw ApplicationFailure.nonRetryable(
          `Condition node ${node.id} has duplicate handle ${branchId}`,
          "CanvasExecutionPlanError"
        );
      }
    }

    const defaultEdge = outboundEdges.find(
      (edge) => edge.sourceHandle === "default"
    );

    if (defaultEdge) {
      return { nextNodeId: defaultEdge.target, edge: defaultEdge };
    }

    if (outboundEdges.length === 1) {
      return {
        nextNodeId: outboundEdges[0]?.target ?? null,
        edge: outboundEdges[0],
      };
    }

    throw ApplicationFailure.nonRetryable(
      `Condition node ${node.id} did not match any branch`,
      "CanvasExecutionPlanError"
    );
  }

  if (node.type === "approval") {
    if (!branchId) {
      throw ApplicationFailure.nonRetryable(
        `Approval node ${node.id} did not return a branch`,
        "CanvasExecutionPlanError"
      );
    }

    const matches = outboundEdges.filter(
      (edge) => edge.sourceHandle === branchId
    );

    if (matches.length === 1) {
      return { nextNodeId: matches[0]?.target ?? null, edge: matches[0] };
    }

    if (matches.length > 1) {
      throw ApplicationFailure.nonRetryable(
        `Approval node ${node.id} has duplicate handle ${branchId}`,
        "CanvasExecutionPlanError"
      );
    }

    throw ApplicationFailure.nonRetryable(
      `Approval node ${node.id} did not match branch ${branchId}`,
      "CanvasExecutionPlanError"
    );
  }

  if (node.type === "input") {
    if (branchId) {
      const matches = outboundEdges.filter(
        (edge) => edge.sourceHandle === branchId
      );

      if (matches.length === 1) {
        return { nextNodeId: matches[0]?.target ?? null, edge: matches[0] };
      }

      if (matches.length > 1) {
        throw ApplicationFailure.nonRetryable(
          `Input node ${node.id} has duplicate handle ${branchId}`,
          "CanvasExecutionPlanError"
        );
      }

      throw ApplicationFailure.nonRetryable(
        `Input node ${node.id} did not match branch ${branchId}`,
        "CanvasExecutionPlanError"
      );
    }

    if (outboundEdges.length === 1) {
      return {
        nextNodeId: outboundEdges[0]?.target ?? null,
        edge: outboundEdges[0],
      };
    }

    throw ApplicationFailure.nonRetryable(
      `Input node ${node.id} has invalid outbound count`,
      "CanvasExecutionPlanError"
    );
  }

  if (node.type === "loop") {
    if (!branchId) {
      throw ApplicationFailure.nonRetryable(
        `Loop node ${node.id} did not return a branch`,
        "CanvasExecutionPlanError"
      );
    }

    const matches = outboundEdges.filter(
      (edge) => edge.sourceHandle === branchId
    );

    if (matches.length === 1) {
      return { nextNodeId: matches[0]?.target ?? null, edge: matches[0] };
    }

    if (matches.length > 1) {
      throw ApplicationFailure.nonRetryable(
        `Loop node ${node.id} has duplicate handle ${branchId}`,
        "CanvasExecutionPlanError"
      );
    }

    throw ApplicationFailure.nonRetryable(
      `Loop node ${node.id} did not match branch ${branchId}`,
      "CanvasExecutionPlanError"
    );
  }

  if (outboundEdges.length !== 1) {
    throw ApplicationFailure.nonRetryable(
      `Node ${node.id} has invalid outbound count`,
      "CanvasExecutionPlanError"
    );
  }
  return {
    nextNodeId: outboundEdges[0]?.target ?? null,
    edge: outboundEdges[0],
  };
}

type TaskResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown }
  | { status: "skipped"; reason: string };

async function runTasksWithConcurrency<T>(params: {
  tasks: Array<() => Promise<T>>;
  maxConcurrency: number;
  stopOnError: boolean;
}): Promise<TaskResult<T>[]> {
  const { tasks, maxConcurrency, stopOnError } = params;
  if (tasks.length === 0) {
    return [];
  }

  const results: TaskResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;
  let active = 0;
  let stopped = false;

  return await new Promise((resolve) => {
    const finalize = () => {
      if (stopped) {
        for (let i = nextIndex; i < tasks.length; i += 1) {
          results[i] = {
            status: "skipped",
            reason: "Skipped after failure",
          };
        }
      }
      resolve(results);
    };

    const launch = () => {
      if (stopped && active === 0) {
        finalize();
        return;
      }

      while (!stopped && active < maxConcurrency && nextIndex < tasks.length) {
        const index = nextIndex;
        nextIndex += 1;
        active += 1;

        const task = tasks[index];
        if (!task) {
          results[index] = {
            status: "rejected",
            reason: new Error("Task not found"),
          };
          active -= 1;
          if (stopOnError) {
            stopped = true;
          }
          if (active === 0 && (stopped || nextIndex >= tasks.length)) {
            finalize();
          }
          continue;
        }

        task()
          .then((value) => {
            results[index] = { status: "fulfilled", value };
          })
          .catch((reason) => {
            results[index] = { status: "rejected", reason };
            if (stopOnError) {
              stopped = true;
            }
          })
          .finally(() => {
            active -= 1;
            if (active === 0 && (stopped || nextIndex >= tasks.length)) {
              finalize();
            } else {
              launch();
            }
          });
      }

      if (active === 0 && nextIndex >= tasks.length) {
        finalize();
      }
    };

    launch();
  });
}

function getWorkflowMetadata(status: ExecutionStatus) {
  const info = workflowInfo();

  return {
    workflowId: info.workflowId,
    runId: info.runId,
    temporalStatus: status,
    historyEventCount: info.historyLength,
    historySizeBytes: info.historySize,
  };
}

function formatPlanError(error: unknown): string {
  if (error instanceof CanvasValidationError) {
    return error.issues.join("; ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function compilePlanOrThrow(
  input: AgentCanvasExecutionInput,
  startedAt: number
): Promise<ExecutionPlan> {
  try {
    const plan = compileCanvasPlan(input.canvas);
    ensureSupportedNodes(plan);
    enforceExecutionPlan(plan);
    return plan;
  } catch (error) {
    const completedAt = getTimestamp();
    const message = formatPlanError(error);

    const trace = createInitialTrace(input, startedAt);
    trace.status = "FAILED";
    trace.error = message;
    trace.completedAt = completedAt;
    trace.totalLatencyMs = completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "FAILED",
      error: message,
      trace,
      startedAt,
      completedAt,
      ...getWorkflowMetadata("FAILED"),
    });

    throw ApplicationFailure.nonRetryable(message, "CanvasValidationError");
  }
}

async function initializeExecution(
  input: AgentCanvasExecutionInput,
  plan: ExecutionPlan,
  trace: ExecutionTrace,
  startedAt: number
): Promise<void> {
  await updateActivities.updateCanvasExecution({
    executionId: input.executionId,
    teamId: input.teamId,
    status: "RUNNING",
    currentNodeId: plan.startNodeId,
    trace,
    startedAt,
    ...getWorkflowMetadata("RUNNING"),
  });
}

async function executePlanNodes(params: {
  input: AgentCanvasExecutionInput;
  plan: ExecutionPlan;
  trace: ExecutionTrace;
  state: CanvasExecutionState;
  approvalResponses: Map<string, CanvasApprovalSignalPayload>;
  inputResponses: Map<string, CanvasInputSignalPayload>;
  startedAt: number;
}): Promise<{ output: unknown; cancelled: boolean }> {
  const {
    input,
    plan,
    trace,
    state,
    approvalResponses,
    inputResponses,
    startedAt,
  } = params;
  const { nodesById, edgesBySource, edgesByTarget } = buildExecutionGraph(plan);
  const workflowMeta = workflowInfo();
  const executionContext = {
    executionId: input.executionId,
    agentCanvasId: input.agentCanvasId,
    versionNumber: input.versionNumber,
    teamId: input.teamId,
    triggeredById: input.triggeredById,
    triggerSource: input.triggerSource,
    workflowId: workflowMeta.workflowId,
    runId: workflowMeta.runId,
    input: input.input,
  };
  const parallelPlans = new Map<string, ParallelSplitPlan>();
  const parallelMapPlans = new Map<string, ParallelMapPlan>();

  type RunExecutionParams = {
    startNodeId: string | null;
    input: unknown;
    stopNodeIds?: Set<string>;
    loopStates: Map<string, LoopState>;
    loopStack: string[];
  };

  type RunExecutionResult = {
    output: unknown;
    cancelled: boolean;
    stoppedAt?: string | null;
  };

  async function handleParallelSplitNode(splitParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
    lastStepOutput: unknown;
    runExecution: (params: RunExecutionParams) => Promise<RunExecutionResult>;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const {
      node,
      currentPayload,
      lastStepOutput,
      runExecution: runBranchExecution,
    } = splitParams;
    const splitResult = await executeActivities.executeParallelSplitNode({
      executionId: input.executionId,
      teamId: input.teamId,
      node,
      input: currentPayload,
    });

    const splitStep = buildCompletedStep(node, currentPayload, splitResult);
    trace.steps.push(splitStep);
    updateTraceForInput(trace, splitStep);
    updateTraceForOutput(trace, splitStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = splitResult.completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const splitConfig = ParallelSplitNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const cachedPlan = parallelPlans.get(node.id);
    const splitPlan =
      cachedPlan ??
      resolveParallelSplitPlan({
        splitNode: node,
        nodesById,
        edgesBySource,
        edgesByTarget,
      });
    if (!cachedPlan) {
      parallelPlans.set(node.id, splitPlan);
    }

    const branchInputMap = new Map<string, unknown>();
    for (const branch of splitResult.output.branches) {
      branchInputMap.set(branch.branchId, branch.inputRef ?? branch.input);
    }

    const branchExecutions = splitPlan.branches.map((branch) => {
      const inputValue = branchInputMap.get(branch.branchId);
      if (inputValue === undefined) {
        throw new Error(
          `Parallel split node ${node.id} missing input for ${branch.branchId}`
        );
      }
      return { ...branch, input: inputValue };
    });

    const branchTasks = branchExecutions.map((branch) => async () => {
      const branchLoopStates = new Map<string, LoopState>();
      const branchLoopStack: string[] = [];
      const result = await runBranchExecution({
        startNodeId: branch.startNodeId,
        input: branch.input,
        stopNodeIds: new Set([splitPlan.joinNodeId]),
        loopStates: branchLoopStates,
        loopStack: branchLoopStack,
      });
      return { branch, result };
    });

    const maxConcurrency =
      splitConfig.executionMode === "parallel"
        ? Math.max(1, splitConfig.maxConcurrency ?? branchTasks.length)
        : 1;

    const branchStartAt = getTimestamp();
    const taskResults = await runTasksWithConcurrency({
      tasks: branchTasks,
      maxConcurrency,
      stopOnError: splitConfig.errorHandling === "failFast",
    });

    const branchElapsedMs = getTimestamp() - branchStartAt;
    if (
      splitConfig.timeoutMs !== undefined &&
      branchElapsedMs > splitConfig.timeoutMs
    ) {
      throw ApplicationFailure.nonRetryable(
        `Parallel split node ${node.id} timed out`,
        "CanvasExecutionTimeout"
      );
    }

    const firstFailure = taskResults.find(
      (taskResult): taskResult is { status: "rejected"; reason: unknown } =>
        taskResult.status === "rejected"
    );

    if (splitConfig.errorHandling === "failFast" && firstFailure) {
      throw firstFailure.reason;
    }

    if (state.cancelled) {
      return {
        nextNodeId: null,
        output: lastStepOutput,
        cancelled: true,
      };
    }

    const joinNode = nodesById.get(splitPlan.joinNodeId);
    if (!joinNode) {
      throw ApplicationFailure.nonRetryable(
        `Parallel join ${splitPlan.joinNodeId} not found`,
        "CanvasExecutionPlanError"
      );
    }

    const joinConfig = ParallelJoinNodeConfigSchema.parse(
      resolveNodeConfig(joinNode.data)
    );

    if (
      joinConfig.timeoutMs !== undefined &&
      branchElapsedMs > joinConfig.timeoutMs
    ) {
      throw ApplicationFailure.nonRetryable(
        `Parallel join node ${joinNode.id} timed out`,
        "CanvasExecutionTimeout"
      );
    }

    const joinInputs: ParallelJoinBranchResult[] = taskResults.map(
      (taskResult, index) => {
        const branch = branchExecutions[index];
        if (!branch) {
          throw new Error(`Parallel split node ${node.id} missing branch`);
        }

        switch (taskResult.status) {
          case "fulfilled": {
            const runResult = taskResult.value;
            if (runResult.result.stoppedAt !== splitPlan.joinNodeId) {
              throw new Error(
                `Parallel split node ${node.id} did not reach join`
              );
            }
            const outputValue = runResult.result.output;
            if (isExecutionDataRef(outputValue)) {
              return {
                branchId: branch.joinInputId,
                outputRef: outputValue,
              };
            }
            return { branchId: branch.joinInputId, output: outputValue };
          }
          case "rejected": {
            const message =
              taskResult.reason instanceof Error
                ? taskResult.reason.message
                : String(taskResult.reason);
            if (splitConfig.errorHandling === "collectErrors") {
              return {
                branchId: branch.joinInputId,
                error: message,
              };
            }
            return { branchId: branch.joinInputId };
          }
          case "skipped": {
            if (splitConfig.errorHandling === "collectErrors") {
              return {
                branchId: branch.joinInputId,
                error: taskResult.reason,
              };
            }
            return { branchId: branch.joinInputId };
          }
          default: {
            throw new Error(
              `Parallel split node ${node.id} has invalid branch result`
            );
          }
        }
      }
    );

    const joinResult = await executeActivities.executeParallelJoinNode({
      executionId: input.executionId,
      teamId: input.teamId,
      node: joinNode,
      branches: joinInputs,
    });

    const joinStep = buildCompletedStep(joinNode, joinInputs, joinResult);
    trace.steps.push(joinStep);
    updateTraceForInput(trace, joinStep);
    updateTraceForOutput(trace, joinStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = joinResult.completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      currentNodeId: joinNode.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const joinOutput = joinResult.outputRef ?? joinResult.output;
    const nextNodeId = resolveNextEdge({
      node: joinNode,
      edgesBySource,
      branchId: null,
    }).nextNodeId;

    return {
      nextNodeId,
      output: joinOutput,
      cancelled: false,
    };
  }

  async function handleParallelMapNode(mapParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
    lastStepOutput: unknown;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const { node, currentPayload, lastStepOutput } = mapParams;
    const mapConfig = ParallelMapNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const prepResult = await executeActivities.executeParallelMapNode({
      executionId: input.executionId,
      teamId: input.teamId,
      node,
      input: currentPayload,
    });

    const cachedPlan = parallelMapPlans.get(node.id);
    const mapPlan =
      cachedPlan ??
      resolveParallelMapPlan({
        mapNode: node,
        nodesById,
        edgesBySource,
      });
    if (!cachedPlan) {
      parallelMapPlans.set(node.id, mapPlan);
    }

    const targetNode = nodesById.get(mapPlan.targetNodeId);
    if (!targetNode) {
      throw ApplicationFailure.nonRetryable(
        `Parallel map target ${mapPlan.targetNodeId} not found`,
        "CanvasExecutionPlanError"
      );
    }

    const total = prepResult.collectionSize;
    const batchSize =
      mapConfig.batchSize && mapConfig.batchSize > 0
        ? mapConfig.batchSize
        : total;
    const concurrency = Math.max(1, mapConfig.maxConcurrency ?? 1);
    const entries: ParallelMapItemResult[] = [];
    const mapStartedAt = prepResult.startedAt;
    const mapStart = getTimestamp();
    let firstFailure: unknown | null = null;

    for (let offset = 0; offset < total; offset += batchSize) {
      const limit = Math.min(batchSize, total - offset);
      const batch = await executeActivities.resolveParallelMapBatch({
        executionId: input.executionId,
        teamId: input.teamId,
        collectionRef: prepResult.collectionRef,
        offset,
        limit,
      });
      const batchItems = batch.items.map((item, index) => {
        const itemIndex = offset + index;
        return {
          item,
          index: itemIndex,
          input: buildParallelMapItemInput({
            input: currentPayload,
            item,
            index: itemIndex,
            config: mapConfig,
          }),
        };
      });

      const tasks = batchItems.map((batchItem) => async () => {
        const taskStartedAt = getTimestamp();
        const inputValue = batchItem.input;
        try {
          const result = await executeActivities.executeCanvasNode({
            executionId: input.executionId,
            teamId: input.teamId,
            node: targetNode,
            input: inputValue,
            context: executionContext,
          });
          return {
            batchItem,
            input: inputValue,
            result,
            startedAt: taskStartedAt,
          };
        } catch (error) {
          throw new ParallelMapTaskError({
            error,
            item: batchItem.item,
            index: batchItem.index,
            input: inputValue,
            startedAt: taskStartedAt,
          });
        }
      });

      const taskResults = await runTasksWithConcurrency({
        tasks,
        maxConcurrency: Math.min(concurrency, batchItems.length || 1),
        stopOnError: !mapConfig.continueOnError,
      });

      for (let index = 0; index < taskResults.length; index += 1) {
        const taskResult = taskResults[index];
        const batchItem = batchItems[index];
        const inputValue = batchItem?.input;

        if (!(taskResult && batchItem && inputValue)) {
          continue;
        }

        if (taskResult.status === "fulfilled") {
          const completed = taskResult.value;
          const step = buildCompletedStep(
            targetNode,
            inputValue,
            completed.result
          );
          trace.steps.push(step);
          updateTraceForInput(trace, step);
          updateTraceForOutput(trace, step);

          entries.push({
            status: "fulfilled",
            index: completed.batchItem.index,
            item: completed.batchItem.item,
            output: completed.result.outputRef ?? completed.result.output,
          });
          continue;
        }

        if (taskResult.status === "rejected") {
          const reason =
            taskResult.reason instanceof ParallelMapTaskError
              ? taskResult.reason.details
              : undefined;
          const message = resolveFailureMessage(reason?.error ?? taskResult);
          const failureStartedAt = reason?.startedAt ?? getTimestamp();
          const completedAt = getTimestamp();
          const step = buildFailedStep({
            node: targetNode,
            input: reason?.input ?? inputValue,
            error: message,
            startedAt: failureStartedAt,
            completedAt,
          });
          trace.steps.push(step);
          updateTraceForInput(trace, step);

          entries.push({
            status: "rejected",
            index: reason?.index ?? batchItem.index,
            item: reason?.item ?? batchItem.item,
            error: message,
          });

          if (!(mapConfig.continueOnError || firstFailure)) {
            firstFailure = reason?.error ?? taskResult.reason;
          }
        }
      }

      if (mapConfig.progressTracking) {
        trace.status = "RUNNING";
        trace.totalLatencyMs = getTimestamp() - startedAt;

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "RUNNING",
          currentNodeId: node.id,
          trace,
          latencyMs: trace.totalLatencyMs,
          ...getWorkflowMetadata("RUNNING"),
        });
      }

      if (state.cancelled) {
        return {
          nextNodeId: null,
          output: lastStepOutput,
          cancelled: true,
        };
      }

      if (mapConfig.batchDelayMs > 0 && offset + batchSize < total) {
        await sleep(mapConfig.batchDelayMs);
      }

      if (
        mapConfig.timeout !== undefined &&
        getTimestamp() - mapStart > mapConfig.timeout
      ) {
        throw ApplicationFailure.nonRetryable(
          `Parallel map node ${node.id} timed out`,
          "CanvasExecutionTimeout"
        );
      }

      if (!mapConfig.continueOnError && firstFailure) {
        throw firstFailure;
      }
    }

    const aggregatedOutput = aggregateParallelMapResults({
      entries,
      mode: mapConfig.aggregationMode,
      continueOnError: mapConfig.continueOnError,
    });
    const storedOutput = await executeActivities.storeParallelMapOutput({
      executionId: input.executionId,
      teamId: input.teamId,
      nodeId: node.id,
      output: aggregatedOutput,
    });
    const mapStep = buildCompletedStep(node, currentPayload, {
      output: storedOutput.output,
      outputRef: storedOutput.outputRef,
      inputRef: prepResult.inputRef,
      startedAt: mapStartedAt,
      completedAt: storedOutput.completedAt,
      latencyMs: storedOutput.completedAt - mapStartedAt,
    });
    trace.steps.push(mapStep);
    updateTraceForInput(trace, mapStep);
    updateTraceForOutput(trace, mapStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = storedOutput.completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    return {
      nextNodeId: mapPlan.nextNodeId,
      output: storedOutput.outputRef ?? storedOutput.output,
      cancelled: false,
    };
  }

  async function handleRetryNode(retryParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
    lastStepOutput: unknown;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const { node, currentPayload, lastStepOutput } = retryParams;
    const retryConfig = RetryNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const targetEdge = resolveNextEdge({
      node,
      edgesBySource,
      branchId: null,
    });
    const targetNodeId = targetEdge.nextNodeId;

    if (!targetNodeId) {
      throw ApplicationFailure.nonRetryable(
        `Retry node ${node.id} has no target`,
        "CanvasExecutionPlanError"
      );
    }

    const targetNode = nodesById.get(targetNodeId);
    if (!targetNode) {
      throw ApplicationFailure.nonRetryable(
        `Retry node ${node.id} target ${targetNodeId} not found`,
        "CanvasExecutionPlanError"
      );
    }

    const retryStartedAt = getTimestamp();
    const seedBase = `${workflowMeta.workflowId}:${workflowMeta.runId}:${node.id}:${targetNode.id}`;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt += 1) {
      await condition(() => !state.paused || state.cancelled);

      if (state.cancelled) {
        return {
          nextNodeId: null,
          output: lastStepOutput,
          cancelled: true,
        };
      }

      const attemptStartedAt = getTimestamp();

      try {
        const result = await executeNoRetryActivities.executeCanvasNode({
          executionId: input.executionId,
          teamId: input.teamId,
          node: targetNode,
          input: currentPayload,
          context: executionContext,
        });

        const step = buildCompletedStep(targetNode, currentPayload, result);
        trace.steps.push(step);
        updateTraceForInput(trace, step);
        updateTraceForOutput(trace, step);
        trace.status = "RUNNING";
        trace.totalLatencyMs = result.completedAt - startedAt;

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "RUNNING",
          currentNodeId: targetNode.id,
          trace,
          latencyMs: trace.totalLatencyMs,
          ...getWorkflowMetadata("RUNNING"),
        });

        const retryStep = buildCompletedStep(node, currentPayload, {
          output: result.output,
          outputRef: result.outputRef,
          inputRef: result.inputRef,
          startedAt: retryStartedAt,
          completedAt: result.completedAt,
          latencyMs: result.completedAt - retryStartedAt,
        });
        trace.steps.push(retryStep);
        updateTraceForInput(trace, retryStep);
        updateTraceForOutput(trace, retryStep);
        trace.status = "RUNNING";
        trace.totalLatencyMs = result.completedAt - startedAt;

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "RUNNING",
          currentNodeId: node.id,
          trace,
          latencyMs: trace.totalLatencyMs,
          ...getWorkflowMetadata("RUNNING"),
        });

        const stepOutput = result.outputRef ?? result.output;
        const branchId =
          targetNode.type === "condition" ? extractBranchId(stepOutput) : null;
        const nextNodeId = resolveNextEdge({
          node: targetNode,
          edgesBySource,
          branchId,
        }).nextNodeId;

        return { nextNodeId, output: stepOutput, cancelled: false };
      } catch (error) {
        const completedAt = getTimestamp();
        const message = resolveFailureMessage(error);
        const step = buildFailedStep({
          node: targetNode,
          input: currentPayload,
          error: message,
          startedAt: attemptStartedAt,
          completedAt,
        });
        trace.steps.push(step);
        updateTraceForInput(trace, step);
        trace.status = "RUNNING";
        trace.totalLatencyMs = completedAt - startedAt;

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "RUNNING",
          currentNodeId: targetNode.id,
          trace,
          latencyMs: trace.totalLatencyMs,
          ...getWorkflowMetadata("RUNNING"),
        });

        if (
          attempt >= retryConfig.maxAttempts ||
          !shouldRetryFailure(error, retryConfig)
        ) {
          throw error;
        }

        const delayMs = resolveRetryDelayMs({
          attempt,
          config: retryConfig,
          seed: `${seedBase}:${attempt}`,
        });
        if (delayMs > 0) {
          await sleep(delayMs);
        }
      }
    }

    return { nextNodeId: null, output: lastStepOutput, cancelled: false };
  }

  async function handleTryCatchNode(tryCatchParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const { node, currentPayload } = tryCatchParams;
    const tryCatchConfig = TryCatchNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const outboundEdges = edgesBySource.get(node.id) ?? [];
    const tryEdge = outboundEdges.find((edge) => edge.sourceHandle === "try");
    const catchEdge = outboundEdges.find(
      (edge) => edge.sourceHandle === "catch"
    );

    if (!(tryEdge && catchEdge)) {
      throw ApplicationFailure.nonRetryable(
        `Try/catch node ${node.id} is missing try or catch branch`,
        "CanvasExecutionPlanError"
      );
    }

    const tryNode = nodesById.get(tryEdge.target);
    const catchNode = nodesById.get(catchEdge.target);

    if (!(tryNode && catchNode)) {
      throw ApplicationFailure.nonRetryable(
        `Try/catch node ${node.id} targets invalid nodes`,
        "CanvasExecutionPlanError"
      );
    }

    const tryCatchStartedAt = getTimestamp();

    try {
      const result = await executeActivities.executeCanvasNode({
        executionId: input.executionId,
        teamId: input.teamId,
        node: tryNode,
        input: currentPayload,
        context: executionContext,
      });

      const tryStep = buildCompletedStep(tryNode, currentPayload, result);
      trace.steps.push(tryStep);
      updateTraceForInput(trace, tryStep);
      updateTraceForOutput(trace, tryStep);
      trace.status = "RUNNING";
      trace.totalLatencyMs = result.completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "RUNNING",
        currentNodeId: tryNode.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      const tryOutput = result.outputRef ?? result.output;
      const tryCatchStep = buildCompletedStep(node, currentPayload, {
        output: tryOutput,
        startedAt: tryCatchStartedAt,
        completedAt: result.completedAt,
        latencyMs: result.completedAt - tryCatchStartedAt,
      });
      trace.steps.push(tryCatchStep);
      updateTraceForInput(trace, tryCatchStep);
      updateTraceForOutput(trace, tryCatchStep);
      trace.status = "RUNNING";
      trace.totalLatencyMs = result.completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "RUNNING",
        currentNodeId: node.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      const branchId =
        tryNode.type === "condition" ? extractBranchId(tryOutput) : null;
      const nextNodeId = resolveNextEdge({
        node: tryNode,
        edgesBySource,
        branchId,
      }).nextNodeId;

      return { nextNodeId, output: tryOutput, cancelled: false };
    } catch (error) {
      const completedAt = getTimestamp();
      const message = resolveFailureMessage(error);
      const failedStep = buildFailedStep({
        node: tryNode,
        input: currentPayload,
        error: message,
        startedAt: tryCatchStartedAt,
        completedAt,
      });
      trace.steps.push(failedStep);
      updateTraceForInput(trace, failedStep);
      trace.status = "RUNNING";
      trace.totalLatencyMs = completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "RUNNING",
        currentNodeId: tryNode.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      if (!shouldCatchFailure(error, tryCatchConfig)) {
        throw error;
      }

      const failureDetails = resolveFailureDetails(error);
      const catchInput = tryCatchConfig.logErrors
        ? {
            error: {
              message,
              name: failureDetails.name,
              type: failureDetails.type,
            },
            input: currentPayload,
            nodeId: tryNode.id,
            nodeType: tryNode.type,
          }
        : { input: currentPayload, nodeId: tryNode.id, nodeType: tryNode.type };

      const catchResult = await executeActivities.executeCanvasNode({
        executionId: input.executionId,
        teamId: input.teamId,
        node: catchNode,
        input: catchInput,
        context: executionContext,
      });

      const catchStep = buildCompletedStep(catchNode, catchInput, catchResult);
      trace.steps.push(catchStep);
      updateTraceForInput(trace, catchStep);
      updateTraceForOutput(trace, catchStep);
      trace.status = "RUNNING";
      trace.totalLatencyMs = catchResult.completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "RUNNING",
        currentNodeId: catchNode.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      const catchOutput = catchResult.outputRef ?? catchResult.output;
      const resolvedCatchOutput =
        catchOutput === undefined && tryCatchConfig.fallbackValue !== undefined
          ? tryCatchConfig.fallbackValue
          : catchOutput;

      const tryCatchStep = buildCompletedStep(node, currentPayload, {
        output: resolvedCatchOutput,
        startedAt: tryCatchStartedAt,
        completedAt: catchResult.completedAt,
        latencyMs: catchResult.completedAt - tryCatchStartedAt,
      });
      trace.steps.push(tryCatchStep);
      updateTraceForInput(trace, tryCatchStep);
      updateTraceForOutput(trace, tryCatchStep);
      trace.status = "RUNNING";
      trace.totalLatencyMs = catchResult.completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "RUNNING",
        currentNodeId: node.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      const branchId =
        catchNode.type === "condition" ? extractBranchId(catchOutput) : null;
      const nextNodeId = resolveNextEdge({
        node: catchNode,
        edgesBySource,
        branchId,
      }).nextNodeId;

      return { nextNodeId, output: resolvedCatchOutput, cancelled: false };
    }
  }

  async function waitForApprovalResponse(approvalParams: {
    approvalId: string;
    timeoutMs?: number;
  }): Promise<{
    response?: CanvasApprovalSignalPayload;
    timedOut: boolean;
    cancelled: boolean;
  }> {
    const hasResponse = () => approvalResponses.has(approvalParams.approvalId);

    if (approvalParams.timeoutMs && approvalParams.timeoutMs > 0) {
      const signaled = await condition(
        () => state.cancelled || hasResponse(),
        approvalParams.timeoutMs
      );
      if (!signaled) {
        return { timedOut: true, cancelled: false };
      }
    } else {
      await condition(() => state.cancelled || hasResponse());
    }

    if (state.cancelled) {
      return { timedOut: false, cancelled: true };
    }

    const response = approvalResponses.get(approvalParams.approvalId);
    if (response) {
      approvalResponses.delete(approvalParams.approvalId);
    }

    return { response, timedOut: false, cancelled: false };
  }

  async function handleApprovalNode(approvalParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const { node, currentPayload } = approvalParams;
    const approvalConfig = ApprovalNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const stepStartedAt = getTimestamp();

    const stepResult = await stepActivities.createCanvasExecutionStep({
      executionId: input.executionId,
      teamId: input.teamId,
      node,
      input: currentPayload,
      status: "WAITING_APPROVAL",
      startedAt: stepStartedAt,
    });

    const approvalRecord = await stepActivities.createCanvasApproval({
      executionId: input.executionId,
      nodeId: node.id,
      requestMessage: approvalConfig.message,
      timeoutMs: approvalConfig.timeoutMs,
    });

    const waitingStep = buildWaitingStep({
      node,
      input: currentPayload,
      inputRef: stepResult.inputRef,
      status: "WAITING_APPROVAL",
      startedAt: stepStartedAt,
    });

    trace.steps.push(waitingStep);
    updateTraceForInput(trace, waitingStep);
    trace.status = "WAITING_APPROVAL";
    trace.totalLatencyMs = stepStartedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "WAITING_APPROVAL",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("WAITING_APPROVAL"),
    });

    const approvalWait = await waitForApprovalResponse({
      approvalId: approvalRecord.approvalId,
      timeoutMs: approvalConfig.timeoutMs,
    });

    if (approvalWait.cancelled) {
      return { nextNodeId: null, output: currentPayload, cancelled: true };
    }

    const completedAt = getTimestamp();
    let resolvedStatus: "APPROVED" | "REJECTED";

    if (approvalWait.timedOut) {
      resolvedStatus =
        approvalConfig.timeoutAction === "approve" ? "APPROVED" : "REJECTED";
    } else if (approvalWait.response?.status) {
      resolvedStatus = approvalWait.response.status;
    } else {
      resolvedStatus = "REJECTED";
    }
    const branchId = resolvedStatus === "APPROVED" ? "approved" : "rejected";

    const stepOutput = {
      input: currentPayload,
      approval: {
        approvalId: approvalRecord.approvalId,
        status: resolvedStatus,
        responseMessage: approvalWait.response?.responseMessage,
        respondedById: approvalWait.response?.respondedById,
        respondedAt: approvalWait.response?.timestamp ?? completedAt,
        timedOut: approvalWait.timedOut,
      },
    };

    const stepStatus = approvalWait.timedOut ? "TIMED_OUT" : "COMPLETED";

    const stepUpdate = await stepActivities.updateCanvasExecutionStep({
      executionId: input.executionId,
      teamId: input.teamId,
      stepId: stepResult.stepId,
      nodeId: node.id,
      status: stepStatus,
      output: stepOutput,
      completedAt,
      latencyMs: completedAt - stepStartedAt,
    });

    waitingStep.status = stepStatus;
    waitingStep.output = stepUpdate.outputRef ? undefined : stepUpdate.output;
    waitingStep.outputRef = stepUpdate.outputRef;
    waitingStep.completedAt = completedAt;
    waitingStep.latencyMs = completedAt - stepStartedAt;
    updateTraceForOutput(trace, waitingStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const nextNodeId = resolveNextEdge({
      node,
      edgesBySource,
      branchId,
    }).nextNodeId;

    return { nextNodeId, output: currentPayload, cancelled: false };
  }

  async function waitForInputResponse(inputParams: {
    nodeId: string;
    timeoutMs?: number;
  }): Promise<{
    response?: CanvasInputSignalPayload;
    timedOut: boolean;
    cancelled: boolean;
  }> {
    const hasResponse = () => inputResponses.has(inputParams.nodeId);

    if (inputParams.timeoutMs && inputParams.timeoutMs > 0) {
      const signaled = await condition(
        () => state.cancelled || hasResponse(),
        inputParams.timeoutMs
      );
      if (!signaled) {
        return { timedOut: true, cancelled: false };
      }
    } else {
      await condition(() => state.cancelled || hasResponse());
    }

    if (state.cancelled) {
      return { timedOut: false, cancelled: true };
    }

    const response = inputResponses.get(inputParams.nodeId);
    if (response) {
      inputResponses.delete(inputParams.nodeId);
    }

    return { response, timedOut: false, cancelled: false };
  }

  async function handleInputNode(inputParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const { node, currentPayload } = inputParams;
    const inputConfig = InputNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const stepStartedAt = getTimestamp();

    const stepResult = await stepActivities.createCanvasExecutionStep({
      executionId: input.executionId,
      teamId: input.teamId,
      node,
      input: currentPayload,
      status: "WAITING_INPUT",
      startedAt: stepStartedAt,
    });

    const waitingStep = buildWaitingStep({
      node,
      input: currentPayload,
      inputRef: stepResult.inputRef,
      status: "WAITING_INPUT",
      startedAt: stepStartedAt,
    });

    trace.steps.push(waitingStep);
    updateTraceForInput(trace, waitingStep);
    trace.status = "WAITING_INPUT";
    trace.totalLatencyMs = stepStartedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "WAITING_INPUT",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("WAITING_INPUT"),
    });

    const responseResult = await waitForInputResponse({
      nodeId: node.id,
      timeoutMs: inputConfig.timeoutMs,
    });

    if (responseResult.cancelled) {
      return { nextNodeId: null, output: currentPayload, cancelled: true };
    }

    const applyDefaults = (inputValues: Record<string, unknown>) => {
      const resolved = { ...inputValues };
      for (const field of inputConfig.fields) {
        if (
          resolved[field.id] === undefined &&
          field.defaultValue !== undefined
        ) {
          resolved[field.id] = field.defaultValue;
        }
      }
      return resolved;
    };

    const resolveTimeoutDefaults = () => {
      const defaults: Record<string, unknown> = {};
      const missing: string[] = [];
      for (const field of inputConfig.fields) {
        if (field.defaultValue !== undefined) {
          defaults[field.id] = field.defaultValue;
        } else if (field.validation?.required) {
          missing.push(field.id);
        }
      }
      return { values: defaults, missing };
    };

    const failInputNode = async (message: string) => {
      const completedAt = getTimestamp();
      await stepActivities.updateCanvasExecutionStep({
        executionId: input.executionId,
        teamId: input.teamId,
        stepId: stepResult.stepId,
        nodeId: node.id,
        status: "FAILED",
        error: message,
        completedAt,
        latencyMs: completedAt - stepStartedAt,
      });
      waitingStep.status = "FAILED";
      waitingStep.error = message;
      waitingStep.completedAt = completedAt;
      waitingStep.latencyMs = completedAt - stepStartedAt;
      throw new Error(message);
    };

    let submittedValues: Record<string, unknown> | undefined;
    let skipped = false;
    const timedOut = responseResult.timedOut;

    if (responseResult.timedOut) {
      if (inputConfig.timeoutAction === "error") {
        await failInputNode(`Input node ${node.id} timed out`);
      }

      if (inputConfig.timeoutAction === "default") {
        const defaults = resolveTimeoutDefaults();
        if (defaults.missing.length > 0) {
          await failInputNode(
            `Input node ${node.id} missing defaults for required fields`
          );
        }
        submittedValues = defaults.values;
      } else if (inputConfig.timeoutAction === "skip") {
        if (!inputConfig.allowSkip) {
          await failInputNode(
            `Input node ${node.id} cannot skip without allowSkip`
          );
        }
        skipped = true;
      }
    } else {
      const response = responseResult.response;
      if (!response) {
        await failInputNode(`Input node ${node.id} response missing`);
      }

      skipped = response?.skipped ?? false;

      if (skipped) {
        if (!inputConfig.allowSkip) {
          await failInputNode(
            `Input node ${node.id} cannot skip without allowSkip`
          );
        }
      } else {
        const responseValues = response?.values;
        if (
          !responseValues ||
          typeof responseValues !== "object" ||
          Array.isArray(responseValues)
        ) {
          await failInputNode(`Input node ${node.id} values missing`);
        }
        submittedValues = responseValues as Record<string, unknown>;
      }
    }

    if (!skipped && submittedValues) {
      submittedValues = applyDefaults(submittedValues);
    }

    const completedAt = getTimestamp();
    const stepOutput = {
      input: currentPayload,
      values: submittedValues,
      skipped,
    };

    const stepStatus = timedOut ? "TIMED_OUT" : "COMPLETED";

    const stepUpdate = await stepActivities.updateCanvasExecutionStep({
      executionId: input.executionId,
      teamId: input.teamId,
      stepId: stepResult.stepId,
      nodeId: node.id,
      status: stepStatus,
      output: stepOutput,
      completedAt,
      latencyMs: completedAt - stepStartedAt,
    });

    waitingStep.status = stepStatus;
    waitingStep.output = stepUpdate.outputRef ? undefined : stepUpdate.output;
    waitingStep.outputRef = stepUpdate.outputRef;
    waitingStep.completedAt = completedAt;
    waitingStep.latencyMs = completedAt - stepStartedAt;
    updateTraceForOutput(trace, waitingStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    let branchId: string | null = null;
    if (inputConfig.allowSkip) {
      branchId = skipped ? "skipped" : "data";
    }

    const nextNodeId = resolveNextEdge({
      node,
      edgesBySource,
      branchId,
    }).nextNodeId;

    return {
      nextNodeId,
      output: stepOutput,
      cancelled: false,
    };
  }

  async function handleSubWorkflowNode(subParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  }> {
    const { node, currentPayload } = subParams;
    const stepStartedAt = getTimestamp();

    const stepResult = await stepActivities.createCanvasExecutionStep({
      executionId: input.executionId,
      teamId: input.teamId,
      node,
      input: currentPayload,
      status: "RUNNING",
      startedAt: stepStartedAt,
    });

    const prepared = await subWorkflowActivities.prepareSubWorkflowExecution({
      executionId: input.executionId,
      node,
      input: currentPayload,
      context: executionContext,
    });

    const childInput: AgentCanvasExecutionInput = {
      executionId: prepared.executionId,
      agentCanvasId: prepared.agentCanvasId,
      versionNumber: prepared.versionNumber,
      teamId: input.teamId,
      triggeredById: input.triggeredById,
      triggerSource: `subworkflow:${input.executionId}`,
      input: prepared.input,
      canvas: prepared.canvas,
    };

    const childWorkflowId = generateWorkflowId({
      type: "canvas",
      executionId: prepared.executionId,
    });

    const childHandle = await startChild(agentCanvasExecutionWorkflow, {
      args: [childInput],
      workflowId: childWorkflowId,
      taskQueue: TASK_QUEUES.CANVAS,
    });

    await updateActivities.updateCanvasExecution({
      executionId: prepared.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      workflowId: childHandle.workflowId,
      runId: childHandle.firstExecutionRunId,
      temporalStatus: "RUNNING",
    });

    const failSubWorkflow = async (message: string): Promise<never> => {
      const completedAt = getTimestamp();
      await stepActivities.updateCanvasExecutionStep({
        executionId: input.executionId,
        teamId: input.teamId,
        stepId: stepResult.stepId,
        nodeId: node.id,
        status: "FAILED",
        error: message,
        completedAt,
        latencyMs: completedAt - stepStartedAt,
      });
      throw new Error(message);
    };

    let resolvedOutput: unknown;
    const childStatus = prepared.waitForCompletion ? "COMPLETED" : "STARTED";

    if (prepared.waitForCompletion) {
      const awaitChildResult =
        async (): Promise<AgentCanvasExecutionOutput> => {
          if (prepared.timeoutMs && prepared.timeoutMs > 0) {
            const outcome = await Promise.race([
              childHandle
                .result()
                .then((result) => ({ type: "result" as const, result })),
              sleep(prepared.timeoutMs).then(() => ({
                type: "timeout" as const,
              })),
            ]);

            if (outcome.type !== "result") {
              await childHandle.signal(cancelSignal);
              return await failSubWorkflow(`Sub-workflow ${node.id} timed out`);
            }

            return outcome.result;
          }

          return await childHandle.result();
        };

      const childResult = await awaitChildResult();

      if (childResult.status !== "COMPLETED") {
        await failSubWorkflow(
          `Sub-workflow ${node.id} failed with status ${childResult.status}`
        );
      }

      resolvedOutput = childResult.output;

      if (
        prepared.outputMappings &&
        Object.keys(prepared.outputMappings).length > 0
      ) {
        const mapped = await subWorkflowActivities.resolveSubWorkflowOutput({
          output: resolvedOutput,
          mappings: prepared.outputMappings,
        });
        resolvedOutput = mapped.output;
      }
    } else {
      resolvedOutput = {
        executionId: prepared.executionId,
        workflowId: childHandle.workflowId,
        runId: childHandle.firstExecutionRunId,
        status: "STARTED",
      };
    }

    const completedAt = getTimestamp();
    const stepStatus: ExecutionStatus = "COMPLETED";
    const stepOutput = {
      executionId: prepared.executionId,
      workflowId: childHandle.workflowId,
      runId: childHandle.firstExecutionRunId,
      output: resolvedOutput,
      childStatus,
    };

    const stepUpdate = await stepActivities.updateCanvasExecutionStep({
      executionId: input.executionId,
      teamId: input.teamId,
      stepId: stepResult.stepId,
      nodeId: node.id,
      status: stepStatus,
      output: stepOutput,
      completedAt,
      latencyMs: completedAt - stepStartedAt,
    });

    const step = buildCompletedStep(node, currentPayload, {
      output: stepUpdate.output,
      outputRef: stepUpdate.outputRef,
      inputRef: stepResult.inputRef,
      startedAt: stepStartedAt,
      completedAt,
      latencyMs: completedAt - stepStartedAt,
    });

    trace.steps.push(step);
    updateTraceForInput(trace, step);
    updateTraceForOutput(trace, step);
    trace.status = "RUNNING";
    trace.totalLatencyMs = completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "RUNNING",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const nextNodeId = resolveNextEdge({
      node,
      edgesBySource,
      branchId: null,
    }).nextNodeId;

    return { nextNodeId, output: resolvedOutput, cancelled: false };
  }

  async function handleControlNode(controlParams: {
    node: ExecutionPlanNode;
    currentPayload: unknown;
    lastStepOutput: unknown;
    runExecution: (params: RunExecutionParams) => Promise<RunExecutionResult>;
  }): Promise<{
    nextNodeId: string | null;
    output: unknown;
    cancelled: boolean;
  } | null> {
    const {
      node,
      currentPayload,
      lastStepOutput,
      runExecution: runBranchExecution,
    } = controlParams;

    switch (node.type) {
      case "approval":
        return await handleApprovalNode({ node, currentPayload });
      case "input":
        return await handleInputNode({ node, currentPayload });
      case "sub_workflow":
        return await handleSubWorkflowNode({ node, currentPayload });
      case "try_catch":
        return await handleTryCatchNode({ node, currentPayload });
      case "retry":
        return await handleRetryNode({
          node,
          currentPayload,
          lastStepOutput,
        });
      case "parallel_split":
        return await handleParallelSplitNode({
          node,
          currentPayload,
          lastStepOutput,
          runExecution: runBranchExecution,
        });
      case "parallel_map":
        return await handleParallelMapNode({
          node,
          currentPayload,
          lastStepOutput,
        });
      case "parallel_join":
        throw ApplicationFailure.nonRetryable(
          `Parallel join node ${node.id} executed without split`,
          "CanvasExecutionPlanError"
        );
      default:
        return null;
    }
  }

  const runExecution = async (
    runParams: RunExecutionParams
  ): Promise<RunExecutionResult> => {
    const {
      startNodeId,
      input: initialInput,
      stopNodeIds,
      loopStates: localLoopStates,
      loopStack: localLoopStack,
    } = runParams;
    let currentPayload: unknown = initialInput;
    let lastStepOutput: unknown;
    let currentNodeId: string | null = startNodeId;
    let pendingLoopError: {
      loopNodeId: string;
      error: LoopIterationError;
    } | null = null;

    while (currentNodeId) {
      if (stopNodeIds?.has(currentNodeId)) {
        return {
          output: currentPayload,
          cancelled: state.cancelled,
          stoppedAt: currentNodeId,
        };
      }

      const node = nodesById.get(currentNodeId);
      if (!node) {
        throw ApplicationFailure.nonRetryable(
          `Node ${currentNodeId} not found`,
          "CanvasExecutionPlanError"
        );
      }

      await condition(() => !state.paused || state.cancelled);

      if (state.cancelled) {
        break;
      }

      trace.currentNodeId = node.id;

      const stepStartedAt = getTimestamp();

      try {
        const controlOutcome = await handleControlNode({
          node,
          currentPayload,
          lastStepOutput,
          runExecution,
        });

        if (controlOutcome) {
          if (controlOutcome.cancelled) {
            return { output: controlOutcome.output, cancelled: true };
          }

          currentPayload = controlOutcome.output;
          lastStepOutput = controlOutcome.output;
          currentNodeId = controlOutcome.nextNodeId;
          continue;
        }

        let result:
          | Awaited<ReturnType<typeof executeActivities.executeCanvasNode>>
          | Awaited<ReturnType<typeof executeActivities.executeLoopNode>>;
        let branchId: string | null = null;

        if (node.type === "loop") {
          const iterationError =
            pendingLoopError?.loopNodeId === node.id
              ? pendingLoopError.error
              : undefined;
          if (iterationError) {
            pendingLoopError = null;
          }

          const loopResult = await executeActivities.executeLoopNode({
            executionId: input.executionId,
            teamId: input.teamId,
            node,
            input: currentPayload,
            loopState: localLoopStates.get(node.id),
            iterationError,
          });
          result = loopResult;

          if (loopResult.loopState) {
            localLoopStates.set(node.id, loopResult.loopState);
          } else {
            localLoopStates.delete(node.id);
          }

          branchId = loopResult.branchId;
        } else {
          result = await executeActivities.executeCanvasNode({
            executionId: input.executionId,
            teamId: input.teamId,
            node,
            input: currentPayload,
            context: executionContext,
          });
        }

        const step = buildCompletedStep(node, currentPayload, result);
        trace.steps.push(step);
        updateTraceForInput(trace, step);
        updateTraceForOutput(trace, step);
        trace.status = "RUNNING";
        trace.totalLatencyMs = result.completedAt - startedAt;

        const stepOutput = result.outputRef ?? result.output;
        if (node.type === "condition") {
          branchId = extractBranchId(stepOutput);
        }
        const nextNodeId = resolveNextEdge({
          node,
          edgesBySource,
          branchId,
        }).nextNodeId;

        currentPayload =
          node.type === "condition" ? currentPayload : stepOutput;
        lastStepOutput = stepOutput;
        currentNodeId = nextNodeId;

        if (node.type === "loop") {
          if (branchId === "body") {
            if (localLoopStack.at(-1) !== node.id) {
              localLoopStack.push(node.id);
            }
          } else if (branchId === "done") {
            const index = localLoopStack.lastIndexOf(node.id);
            if (index >= 0) {
              localLoopStack.splice(index, 1);
            }
            localLoopStates.delete(node.id);
          }
        }

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "RUNNING",
          currentNodeId: node.id,
          trace,
          latencyMs: trace.totalLatencyMs,
          ...getWorkflowMetadata("RUNNING"),
        });
      } catch (error) {
        const completedAt = getTimestamp();
        const message = error instanceof Error ? error.message : String(error);
        const existingStep = trace.steps.at(-1);
        const isExistingFailedStep =
          existingStep?.nodeId === node.id && existingStep.status === "FAILED";
        const step = isExistingFailedStep
          ? existingStep
          : buildFailedStep({
              node,
              input: currentPayload,
              error: message,
              startedAt: stepStartedAt,
              completedAt,
            });

        if (!isExistingFailedStep) {
          trace.steps.push(step);
          updateTraceForInput(trace, step);
        }
        trace.currentNodeId = node.id;

        const activeLoopId = localLoopStack.at(-1);
        if (activeLoopId && activeLoopId !== node.id) {
          const loopNode = nodesById.get(activeLoopId);
          if (loopNode?.type === "loop") {
            const loopConfig = LoopNodeConfigSchema.safeParse(
              resolveNodeConfig(loopNode.data)
            );

            if (
              loopConfig.success &&
              loopConfig.data.errorHandling !== "stop"
            ) {
              const loopState = localLoopStates.get(activeLoopId);
              const iterationError: LoopIterationError = {
                message,
                nodeId: node.id,
                nodeType: node.type,
                iteration: loopState?.iteration ?? 0,
                index: loopState?.index,
                occurredAt: completedAt,
              };

              pendingLoopError = {
                loopNodeId: activeLoopId,
                error: iterationError,
              };

              trace.status = "RUNNING";
              trace.totalLatencyMs = completedAt - startedAt;

              await updateActivities.updateCanvasExecution({
                executionId: input.executionId,
                teamId: input.teamId,
                status: "RUNNING",
                currentNodeId: node.id,
                trace,
                latencyMs: trace.totalLatencyMs,
                ...getWorkflowMetadata("RUNNING"),
              });

              currentNodeId = activeLoopId;
              continue;
            }
          }
        }

        trace.status = "FAILED";
        trace.error = message;
        trace.completedAt = completedAt;
        trace.totalLatencyMs = completedAt - startedAt;

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "FAILED",
          currentNodeId: node.id,
          error: message,
          trace,
          latencyMs: trace.totalLatencyMs,
          startedAt,
          completedAt,
          ...getWorkflowMetadata("FAILED"),
        });

        throw error;
      }
    }

    return { output: lastStepOutput, cancelled: state.cancelled };
  };

  const rootLoopStates = new Map<string, LoopState>();
  const rootLoopStack: string[] = [];
  const executionResult = await runExecution({
    startNodeId: plan.startNodeId,
    input: input.input,
    loopStates: rootLoopStates,
    loopStack: rootLoopStack,
  });

  return {
    output: executionResult.output,
    cancelled: executionResult.cancelled,
  };
}

async function finalizeExecution(params: {
  input: AgentCanvasExecutionInput;
  trace: ExecutionTrace;
  startedAt: number;
  output: unknown;
  cancelled: boolean;
}): Promise<AgentCanvasExecutionOutput> {
  const { input, trace, startedAt, output, cancelled } = params;
  const completedAt = getTimestamp();

  if (cancelled) {
    trace.status = "CANCELLED";
    trace.completedAt = completedAt;
    trace.totalLatencyMs = completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "CANCELLED",
      currentNodeId: trace.currentNodeId ?? null,
      trace,
      latencyMs: trace.totalLatencyMs,
      startedAt,
      completedAt,
      ...getWorkflowMetadata("CANCELLED"),
    });

    return {
      executionId: input.executionId,
      status: "CANCELLED",
      output: undefined,
    };
  }

  trace.status = "COMPLETED";
  trace.completedAt = completedAt;
  trace.totalLatencyMs = completedAt - startedAt;

  await updateActivities.updateCanvasExecution({
    executionId: input.executionId,
    teamId: input.teamId,
    status: "COMPLETED",
    currentNodeId: trace.currentNodeId ?? null,
    output,
    trace,
    latencyMs: trace.totalLatencyMs,
    startedAt,
    completedAt,
    ...getWorkflowMetadata("COMPLETED"),
  });

  return {
    executionId: input.executionId,
    status: "COMPLETED",
    output,
  };
}

export async function agentCanvasExecutionWorkflow(
  rawInput: unknown
): Promise<AgentCanvasExecutionOutput> {
  const input = AgentCanvasExecutionInputSchema.parse(rawInput);
  const startedAt = getTimestamp();
  const state: CanvasExecutionState = { paused: false, cancelled: false };
  const approvalResponses = new Map<string, CanvasApprovalSignalPayload>();
  const inputResponses = new Map<string, CanvasInputSignalPayload>();

  setHandler(cancelSignal, () => {
    state.cancelled = true;
  });

  setHandler(pauseSignal, () => {
    state.paused = true;
  });

  setHandler(resumeSignal, () => {
    state.paused = false;
  });

  setHandler(canvasApprovalSignal, (payload) => {
    if (payload.executionId && payload.executionId !== input.executionId) {
      return;
    }
    approvalResponses.set(payload.approvalId, payload);
  });

  setHandler(canvasInputSignal, (payload) => {
    if (payload.executionId && payload.executionId !== input.executionId) {
      return;
    }
    inputResponses.set(payload.nodeId, payload);
  });

  const plan = await compilePlanOrThrow(input, startedAt);
  const trace = createInitialTrace(input, startedAt);

  setHandler(
    canvasExecutionQuery,
    (): CanvasExecutionQueryState => ({
      executionId: input.executionId,
      status: trace.status,
      currentNodeId: trace.currentNodeId,
      stepsCompleted: trace.steps.filter(
        (s) => s.status === "COMPLETED" || s.status === "FAILED"
      ).length,
      stepsTotal: plan.nodes.length,
      isPaused: state.paused,
      isCancelled: state.cancelled,
      startedAt: trace.startedAt,
      droppedSignals: 0,
      totalNodeExecutions: trace.steps.length,
      continueAsNewCount: 0,
      steps: trace.steps.map((s) => ({
        nodeId: s.nodeId,
        nodeType: s.nodeType,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        error: s.error,
      })),
    })
  );

  await initializeExecution(input, plan, trace, startedAt);

  const { output, cancelled } = await executePlanNodes({
    input,
    plan,
    trace,
    state,
    approvalResponses,
    inputResponses,
    startedAt,
  });

  return await finalizeExecution({
    input,
    trace,
    startedAt,
    output,
    cancelled,
  });
}
