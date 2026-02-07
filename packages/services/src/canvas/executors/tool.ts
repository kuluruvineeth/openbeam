import {
  CompletionService,
  convertZodToJsonSchema,
  getConfig,
  registerAllTools,
  toolRegistry,
} from "@openplane/ai";
import type {
  ChatMessage,
  ToolContextBase,
  ToolExecutionResult,
} from "@openplane/types/ai";
import { ToolContextSchema } from "@openplane/types/ai";
import {
  ParameterBindingSchema,
  type ToolNodeConfig,
  ToolNodeConfigSchema,
  type ToolRetryConfig,
} from "@openplane/types/canvas";
import jmespath from "jmespath";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutionInput, CanvasNodeExecutor } from "../types";

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;

let toolsReady = false;
let toolsInit: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function ensureToolsReady(): Promise<void> {
  if (toolsReady) {
    return;
  }
  if (toolsInit) {
    await toolsInit;
    return;
  }
  toolsInit = (async () => {
    const { createToolServices } = await import("../../ai/tool-binder");
    registerAllTools();
    toolRegistry.bindServices(createToolServices());
    toolsReady = true;
  })();
  await toolsInit;
}

function normalizeVariableRef(ref: string): string {
  let value = ref.trim();
  if (value.startsWith("{{") && value.endsWith("}}")) {
    value = value.slice(2, -2).trim();
  }
  if (value.startsWith("$.")) {
    value = value.slice(2);
  } else if (value.startsWith("$")) {
    value = value.slice(1);
  }
  if (value.startsWith(".")) {
    value = value.slice(1);
  }
  return value;
}

function resolvePath(value: unknown, path: string): unknown {
  const expression = normalizeVariableRef(path);
  if (!expression) {
    return;
  }
  try {
    return jmespath.search(value ?? null, expression);
  } catch {
    return;
  }
}

function resolveVariableRef(params: {
  ref: string;
  input: unknown;
  context: CanvasNodeExecutionInput["context"] | undefined;
  node: CanvasNodeExecutionInput["node"];
}): unknown {
  const expression = normalizeVariableRef(params.ref);
  if (!expression) {
    return;
  }
  const direct = resolvePath(params.input, expression);
  if (direct !== undefined) {
    return direct;
  }
  const composite = {
    input: params.input,
    context: params.context,
    node: { id: params.node.id, type: params.node.type },
  };
  return resolvePath(composite, expression);
}

function normalizeStaticValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(JSON_FENCE_REGEX);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

function formatInputValue(input: unknown): string {
  if (input === undefined || input === null) {
    return "";
  }
  if (typeof input === "string") {
    return input;
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function buildInferencePrompt(params: {
  toolName: string;
  toolDescription: string;
  parameters: Array<{ name: string; description?: string }>;
  input: unknown;
  inputSchema?: Record<string, unknown>;
}): { systemPrompt: string; userPrompt: string } {
  const paramLines = params.parameters.map(
    (param) => `<param name="${param.name}">${param.description ?? ""}</param>`
  );

  const schemaSection = params.inputSchema
    ? `<input_schema>
${JSON.stringify(params.inputSchema, null, 2)}
</input_schema>`
    : "";

  const systemPrompt = `<role>
You infer tool parameter values.
</role>

<instructions>
- Return a valid JSON object only.
- Use only the parameters listed.
- Use null if a value cannot be inferred.
- Do not include any extra keys or text.
</instructions>`;

  const userPrompt = `<tool>
<name>${params.toolName}</name>
<description>${params.toolDescription}</description>
</tool>

<parameters>
${paramLines.join("\n")}
</parameters>

${schemaSection}

<input_context>
${formatInputValue(params.input)}
</input_context>`;

  return { systemPrompt, userPrompt };
}

async function inferParameters(params: {
  toolName: string;
  toolDescription: string;
  parameters: Array<{ name: string; description?: string }>;
  input: unknown;
  inputSchema?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const { systemPrompt, userPrompt } = buildInferencePrompt(params);
  const config = getConfig();
  const completion = new CompletionService();
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const result = await completion.complete(messages, {
    providerId: config.defaultProvider,
    modelId: config.defaultChatModel,
    temperature: Math.min(0.2, config.completion.temperature),
    maxTokens: Math.min(1024, config.completion.maxTokens),
    topP: config.completion.topP,
  });
  const candidate = extractJsonCandidate(result.content ?? "");
  if (!candidate) {
    throw new Error("AI inference returned empty output");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("AI inference output is not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new Error("AI inference output must be an object");
  }
  return parsed;
}

function extractToolContext(input: unknown): ToolContextBase | null {
  if (!isRecord(input)) {
    return null;
  }

  const candidates: unknown[] = [];
  if (isRecord(input.toolContext)) {
    candidates.push(input.toolContext);
  }
  if (isRecord(input.context)) {
    candidates.push(input.context);
  }
  candidates.push(input);

  for (const candidate of candidates) {
    const parsed = ToolContextSchema.safeParse(candidate);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return null;
}

function buildToolContext(params: {
  input: unknown;
  context: CanvasNodeExecutionInput["context"] | undefined;
}): ToolContextBase {
  const base = extractToolContext(params.input);
  if (base) {
    return {
      ...base,
      executionId: base.executionId ?? params.context?.executionId,
    };
  }
  if (!params.context) {
    throw new Error("Tool context with teamId and userId is required");
  }
  return {
    teamId: params.context.teamId,
    userId: params.context.triggeredById,
    executionId: params.context.executionId,
  };
}

function isZodSchema(value: unknown): value is {
  safeParse: (input: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { message: string };
  };
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

function validateParams(
  schema: unknown,
  params: Record<string, unknown>
): {
  params: Record<string, unknown>;
  schemaInfo?: Record<string, unknown>;
} {
  if (!schema) {
    return { params };
  }

  const schemaInfo = isZodSchema(schema)
    ? convertZodToJsonSchema(schema as never)
    : undefined;

  if (!isZodSchema(schema)) {
    return { params, schemaInfo };
  }

  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new Error(parsed.error?.message ?? "Tool parameters are invalid");
  }

  return { params: parsed.data as Record<string, unknown>, schemaInfo };
}

function resolveToolParams(params: {
  config: ToolNodeConfig;
  input: unknown;
  context: CanvasNodeExecutionInput["context"] | undefined;
  node: CanvasNodeExecutionInput["node"];
  toolInfo?: { inputSchema?: unknown; description?: string };
}): Promise<Record<string, unknown>> {
  const bindings = params.config.parameterBindings ?? {};
  const bindingEntries = Object.entries(bindings);
  if (bindingEntries.length === 0) {
    if (isRecord(params.input)) {
      return Promise.resolve({ ...params.input });
    }
    if (params.input === undefined) {
      return Promise.resolve({});
    }
    return Promise.resolve({ input: params.input });
  }

  const resolved: Record<string, unknown> = {};
  const aiTargets: Array<{ name: string; description?: string }> = [];

  for (const [name, binding] of bindingEntries) {
    const parsed = ParameterBindingSchema.parse(binding);
    if (parsed.mode === "static") {
      if (parsed.staticValue !== undefined) {
        resolved[name] = normalizeStaticValue(parsed.staticValue);
      }
      continue;
    }
    if (parsed.mode === "variable") {
      if (parsed.variableRef) {
        resolved[name] = resolveVariableRef({
          ref: parsed.variableRef,
          input: params.input,
          context: params.context,
          node: params.node,
        });
      }
      continue;
    }
    if (parsed.mode === "ai_inferred") {
      aiTargets.push({
        name,
        description: parsed.aiDescription?.trim() || undefined,
      });
    }
  }

  if (aiTargets.length === 0) {
    return Promise.resolve(resolved);
  }

  const toolDescription =
    params.toolInfo?.description?.trim() || params.config.toolId;

  return inferParameters({
    toolName: params.config.toolId,
    toolDescription,
    parameters: aiTargets,
    input: params.input,
    inputSchema: params.toolInfo?.inputSchema
      ? convertZodToJsonSchema(params.toolInfo.inputSchema as never)
      : undefined,
  }).then((inferred) => {
    for (const target of aiTargets) {
      if (Object.hasOwn(inferred, target.name)) {
        resolved[target.name] = inferred[target.name];
      }
    }
    return resolved;
  });
}

function resolveResultPath(result: ToolExecutionResult, path: string): unknown {
  const base =
    result.success && result.data !== undefined ? result.data : result;
  return resolvePath(base, path);
}

function applyResultVariable(params: {
  input: unknown;
  result: unknown;
  variableName?: string;
}): unknown {
  if (!params.variableName?.trim()) {
    return params.result;
  }
  const name = params.variableName.trim();
  if (isRecord(params.input)) {
    return { ...params.input, [name]: params.result };
  }
  return { input: params.input, [name]: params.result };
}

async function executeToolWithRetry(params: {
  tool: {
    execute: (
      input: unknown,
      options: { abortSignal?: AbortSignal }
    ) => Promise<ToolExecutionResult>;
  };
  context: ToolContextBase;
  services: ReturnType<typeof toolRegistry.getServices>;
  input: unknown;
  timeoutMs: number;
  retry: ToolRetryConfig;
}): Promise<ToolExecutionResult> {
  let attempt = 0;
  let backoff = params.retry.backoffMs;

  while (attempt < params.retry.maxAttempts) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);
    try {
      const result = await toolRegistry.runWithContextAsync(
        {
          ...params.context,
          services: params.services,
          abortSignal: controller.signal,
        },
        () =>
          params.tool.execute(params.input, { abortSignal: controller.signal })
      );

      if (!params.retry.enabled || result.success) {
        return result;
      }

      if (!result.error?.retryable || attempt >= params.retry.maxAttempts) {
        return result;
      }
    } catch (error) {
      if (!params.retry.enabled || attempt >= params.retry.maxAttempts) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    await new Promise((resolve) => setTimeout(resolve, backoff));
    if (params.retry.exponential) {
      backoff *= 2;
    }
  }

  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Tool execution failed",
      retryable: false,
    },
  };
}

export const toolExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  let config: ToolNodeConfig | null = null;
  try {
    config = ToolNodeConfigSchema.parse(resolveNodeConfig(node.data));
    if (!config.toolId?.trim()) {
      throw new Error("Tool ID is required");
    }

    await ensureToolsReady();

    const tool = toolRegistry.getTool(config.toolId);
    if (!tool || typeof tool.execute !== "function") {
      throw new Error(`Tool "${config.toolId}" not found`);
    }

    const toolInfo = toolRegistry.getToolInfo(config.toolId) ?? undefined;
    const paramsValue = await resolveToolParams({
      config,
      input,
      context,
      node,
      toolInfo: toolInfo
        ? {
            inputSchema: toolInfo.inputSchema,
            description: toolInfo.description,
          }
        : undefined,
    });

    const validated = validateParams(toolInfo?.inputSchema, paramsValue);
    const toolContext = buildToolContext({ input, context });
    const metadata = toolRegistry.getMetadata(config.toolId);

    if (metadata?.requiredPermissions?.length) {
      const access = toolContext.accessControl ?? [];
      const missing = metadata.requiredPermissions.filter(
        (perm) => !access.includes(perm)
      );
      if (missing.length > 0) {
        throw new Error(`Missing permissions: ${missing.join(", ")}`);
      }
    }

    const retryConfig: ToolRetryConfig = config.retryConfig ?? {
      enabled: false,
      maxAttempts: 3,
      backoffMs: 1000,
      exponential: true,
    };

    const result = await executeToolWithRetry({
      tool: tool as unknown as {
        execute: (
          input: unknown,
          options: { abortSignal?: AbortSignal }
        ) => Promise<ToolExecutionResult>;
      },
      context: toolContext,
      services: toolRegistry.getServices(),
      input: validated.params,
      timeoutMs: config.timeoutMs,
      retry: retryConfig,
    });

    if (!(result.success || config.continueOnError)) {
      throw new Error(result.error?.message ?? "Tool execution failed");
    }

    const finalResult = config.resultPath
      ? resolveResultPath(result, config.resultPath)
      : result;

    return applyResultVariable({
      input,
      result: finalResult,
      variableName: config.resultVariable,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config?.continueOnError) {
      const fallback: ToolExecutionResult = {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
          retryable: false,
        },
      };
      const finalResult = config.resultPath
        ? resolveResultPath(fallback, config.resultPath)
        : fallback;
      return applyResultVariable({
        input,
        result: finalResult,
        variableName: config.resultVariable,
      });
    }
    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
