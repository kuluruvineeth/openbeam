import {
  ApprovalNodeConfigSchema,
  ConditionNodeConfigSchema,
  type ExecutionPlanNode,
  InputNodeConfigSchema,
  LoopNodeConfigSchema,
  ParallelJoinNodeConfigSchema,
  ParallelMapNodeConfigSchema,
  ParallelSplitNodeConfigSchema,
  SubWorkflowNodeConfigSchema,
  TryCatchNodeConfigSchema,
} from "@openbeam/types/canvas";
import { resolveNodeConfig } from "../utils/type-guards";

export function validateConditionConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof ConditionNodeConfigSchema.safeParse> {
  const configResult = ConditionNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Condition node ${node.id} has invalid config`);
  }

  return configResult;
}

export function validateApprovalConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof ApprovalNodeConfigSchema.safeParse> {
  const configResult = ApprovalNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Approval node ${node.id} has invalid config`);
    return configResult;
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

  return configResult;
}

export function validateInputConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof InputNodeConfigSchema.safeParse> {
  const configResult = InputNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Input node ${node.id} has invalid config`);
    return configResult;
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

  return configResult;
}

export function validateLoopConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof LoopNodeConfigSchema.safeParse> {
  const configResult = LoopNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Loop node ${node.id} has invalid config`);
    return configResult;
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

  return configResult;
}

export function validateSubWorkflowConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof SubWorkflowNodeConfigSchema.safeParse> {
  const configResult = SubWorkflowNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Sub-workflow node ${node.id} has invalid config`);
    return configResult;
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

  return configResult;
}

export function validateParallelSplitConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof ParallelSplitNodeConfigSchema.safeParse> {
  const configResult = ParallelSplitNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Parallel split node ${node.id} has invalid config`);
    return configResult;
  }

  if (
    configResult.data.dataDistribution === "partition" &&
    !configResult.data.partitionKey?.trim()
  ) {
    issues.push(`Parallel split node ${node.id} requires partition key`);
  }

  return configResult;
}

export function validateParallelJoinConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof ParallelJoinNodeConfigSchema.safeParse> {
  const configResult = ParallelJoinNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Parallel join node ${node.id} has invalid config`);
  }

  return configResult;
}

export function validateParallelMapConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof ParallelMapNodeConfigSchema.safeParse> {
  const configResult = ParallelMapNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Parallel map node ${node.id} has invalid config`);
    return configResult;
  }

  if (!configResult.data.collection.trim()) {
    issues.push(`Parallel map node ${node.id} requires collection expression`);
  }

  return configResult;
}

export function validateTryCatchConfig(
  node: ExecutionPlanNode,
  issues: string[]
): ReturnType<typeof TryCatchNodeConfigSchema.safeParse> {
  const configResult = TryCatchNodeConfigSchema.safeParse(
    resolveNodeConfig(node.data)
  );

  if (!configResult.success) {
    issues.push(`Try/catch node ${node.id} has invalid config`);
  }

  return configResult;
}
