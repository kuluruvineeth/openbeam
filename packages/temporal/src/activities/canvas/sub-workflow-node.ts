import type { Database } from "@openplane/db";
import {
  createAgentCanvasExecution,
  findAgentCanvasById,
  findAgentCanvasVersion,
  listAgentCanvasVersions,
} from "@openplane/db";
import { evaluateExpression } from "@openplane/services/canvas/expression";
import { resolveNodeConfig } from "@openplane/services/canvas/node-config";
import {
  CanvasStateSchema,
  SubWorkflowNodeConfigSchema,
} from "@openplane/types/canvas";
import type {
  PrepareSubWorkflowExecutionInput,
  PrepareSubWorkflowExecutionOutput,
  ResolveSubWorkflowOutput,
  ResolveSubWorkflowOutputInput,
} from "@openplane/types/temporal";

const VARIABLE_REF = /{{\s*([^}]+)\s*}}/;

type MappingContext = {
  input: unknown;
  context?: Record<string, unknown>;
  node: { id: string; type: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeVariableRef(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(VARIABLE_REF);
  const candidate = match?.[1] ?? trimmed;
  if (!(match || trimmed.startsWith("$") || trimmed.startsWith("."))) {
    return null;
  }
  let expression = candidate.trim();
  if (expression.startsWith("$.")) {
    expression = expression.slice(2);
  } else if (expression.startsWith("$")) {
    expression = expression.slice(1);
  }
  if (expression.startsWith(".")) {
    expression = expression.slice(1);
  }
  return expression.trim() || null;
}

async function resolveMappingValue(
  value: unknown,
  context: MappingContext
): Promise<unknown> {
  if (typeof value !== "string") {
    return value;
  }
  const expression = normalizeVariableRef(value);
  if (!expression) {
    return value;
  }
  const direct = await evaluateExpression({
    expression,
    language: "jmespath",
    data: context.input,
  });
  if (direct !== undefined) {
    return direct;
  }
  return await evaluateExpression({
    expression,
    language: "jmespath",
    data: {
      input: context.input,
      context: context.context,
      node: context.node,
    },
  });
}

async function resolveMappings(params: {
  mappings: Record<string, unknown>;
  input: unknown;
  context?: Record<string, unknown>;
  node: { id: string; type: string };
}): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params.mappings)) {
    resolved[key] = await resolveMappingValue(value, {
      input: params.input,
      context: params.context,
      node: params.node,
    });
  }
  return resolved;
}

function parseVersion(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "latest") {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid workflow version: ${value}`);
  }
  return parsed;
}

async function buildSubWorkflowInput(params: {
  config: ReturnType<typeof SubWorkflowNodeConfigSchema.parse>;
  input: unknown;
  context?: Record<string, unknown>;
  node: { id: string; type: string };
}): Promise<unknown> {
  const mappings = params.config.inputMappings ?? {};
  const mode = params.config.inputMode ?? "fields";

  if (mode === "passthrough") {
    return params.input;
  }

  if (mode === "fields") {
    if (Object.keys(mappings).length === 0) {
      throw new Error("Input mappings are required for fields mode");
    }
    return await resolveMappings({
      mappings,
      input: params.input,
      context: params.context,
      node: params.node,
    });
  }

  if (Object.keys(mappings).length === 0) {
    return params.input;
  }

  return await resolveMappings({
    mappings,
    input: params.input,
    context: params.context,
    node: params.node,
  });
}

export interface SubWorkflowDependencies {
  db: Database;
}

export function createPrepareSubWorkflowExecutionActivity(
  deps: SubWorkflowDependencies
) {
  return async function prepareSubWorkflowExecution(
    input: PrepareSubWorkflowExecutionInput
  ): Promise<PrepareSubWorkflowExecutionOutput> {
    const config = SubWorkflowNodeConfigSchema.parse(
      resolveNodeConfig(input.node.data)
    );
    const context = input.context as Record<string, unknown> | undefined;
    const teamId =
      typeof context?.teamId === "string" ? context.teamId : undefined;
    const triggeredById =
      typeof context?.triggeredById === "string"
        ? context.triggeredById
        : undefined;

    if (!(teamId && triggeredById)) {
      throw new Error("Execution context is required for sub-workflow");
    }

    if (!config.workflowId.trim()) {
      throw new Error("Workflow ID is required");
    }

    const canvas = await findAgentCanvasById(
      deps.db,
      config.workflowId,
      teamId
    );
    if (!canvas) {
      throw new Error("Sub-workflow not found");
    }
    if (canvas.status !== "PUBLISHED") {
      throw new Error("Sub-workflow must be published");
    }

    const explicitVersion = parseVersion(config.version);
    const versionRecord =
      explicitVersion !== null
        ? await findAgentCanvasVersion(
            deps.db,
            config.workflowId,
            explicitVersion
          )
        : (
            await listAgentCanvasVersions(deps.db, config.workflowId, {
              limit: 1,
            })
          )[0];

    if (!versionRecord) {
      throw new Error("Sub-workflow version not found");
    }

    const baseInput = await buildSubWorkflowInput({
      config,
      input: input.input,
      context,
      node: { id: input.node.id, type: input.node.type },
    });

    const resolvedInput =
      config.inheritContext && isRecord(baseInput)
        ? {
            ...baseInput,
            context: baseInput.context ?? context,
          }
        : baseInput;

    const execution = await createAgentCanvasExecution(deps.db, {
      agentCanvasId: config.workflowId,
      versionNumber: versionRecord.version,
      input: resolvedInput,
      trace: { steps: [] },
      triggeredById,
      triggerSource: `subworkflow:${input.executionId}`,
    });

    const canvasState = CanvasStateSchema.parse({
      nodes: versionRecord.nodes,
      edges: versionRecord.edges,
      viewport: versionRecord.viewport ?? undefined,
    });

    return {
      executionId: execution.id,
      agentCanvasId: config.workflowId,
      versionNumber: versionRecord.version,
      canvas: canvasState,
      input: resolvedInput,
      waitForCompletion: config.waitForCompletion,
      timeoutMs: config.timeoutMs,
      outputMappings: config.outputMappings,
    };
  };
}

export function createResolveSubWorkflowOutputActivity() {
  return async function resolveSubWorkflowOutput(
    input: ResolveSubWorkflowOutputInput
  ): Promise<ResolveSubWorkflowOutput> {
    const resolved = await resolveMappings({
      mappings: input.mappings,
      input: input.output,
      context: undefined,
      node: { id: "output", type: "sub_workflow" },
    });
    return { output: resolved };
  };
}
