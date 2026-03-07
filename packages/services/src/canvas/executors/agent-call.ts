import {
  type CoordinatorAgentConfig,
  composeAgents,
  createMemoryAccess,
  createMemoryConsolidator,
  type LlmAgentConfig,
  type LoopAgentConfig,
  type ModelConfig,
  type ParallelAgentConfig,
  parallelizeAgents,
  registerAllTools,
  routeAgents,
  runAgent,
  type SequentialAgentConfig,
  toolRegistry,
} from "@openbeam/ai";
import {
  analystAgentConfig,
  coderAgentConfig,
  codeWithReviewConfig,
  deepResearchAgentConfig,
  driveAnalystConfig,
  multiSourceAnalystConfig,
  notionAnalystConfig,
  researchAgentConfig,
  reviewerAgentConfig,
  slackAnalystConfig,
  writerAgentConfig,
} from "@openbeam/ai/agents";
import { getChatModel, ProviderIdSchema } from "@openbeam/types/ai";
import {
  AgentCallNodeConfigSchema,
  type AgentExecutionMode,
  type AgentOutputFormat,
} from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;
const DEFAULT_SYSTEM_PROMPT = `<role>
You are an AI agent executing a workflow step.
</role>

<instructions>
- Follow the task in the user prompt.
- Use the provided context.
- Be precise and concise.
</instructions>`;

const memoryConsolidator = createMemoryConsolidator();

type AgentPlanConfig =
  | LlmAgentConfig
  | SequentialAgentConfig
  | ParallelAgentConfig
  | CoordinatorAgentConfig
  | LoopAgentConfig;

const PRESET_CONFIGS = new Map<string, AgentPlanConfig>([
  ["research", researchAgentConfig],
  ["deep-research", deepResearchAgentConfig],
  ["analyst", analystAgentConfig],
  ["multi-source-analyst", multiSourceAnalystConfig],
  ["slack-analyst", slackAnalystConfig],
  ["notion-analyst", notionAnalystConfig],
  ["drive-analyst", driveAnalystConfig],
  ["coder", coderAgentConfig],
  ["reviewer", reviewerAgentConfig],
  ["code-with-review", codeWithReviewConfig],
  ["writer", writerAgentConfig],
]);

let toolsReady = false;
let toolsInit: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneConfig<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeAgentId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function parseModel(model: string): ModelConfig {
  const trimmed = model.trim();
  if (!trimmed) {
    throw new Error("Model is required");
  }

  const prefixEnd = trimmed.indexOf(":");
  if (prefixEnd > 0) {
    const prefix = trimmed.slice(0, prefixEnd);
    const candidate = trimmed.slice(prefixEnd + 1);
    const provider = ProviderIdSchema.safeParse(prefix);
    if (provider.success) {
      if (!candidate) {
        throw new Error("Model is required");
      }
      return { providerId: provider.data, modelId: candidate };
    }
  }

  const known = getChatModel(trimmed);
  return { providerId: known?.provider, modelId: trimmed };
}

function mergeModelConfig(
  base: ModelConfig | undefined,
  override: ModelConfig | undefined,
  temperatureOverride: number | undefined
): ModelConfig | undefined {
  if (!(base || override) && temperatureOverride === undefined) {
    return;
  }

  const merged: ModelConfig = {
    ...(base ?? {}),
    ...(override ?? {}),
  };

  if (temperatureOverride !== undefined) {
    merged.temperature = temperatureOverride;
  }

  return merged;
}

function buildSystemPrompt(params: {
  basePrompt?: string;
  stopCondition?: string;
  outputFormat: AgentOutputFormat;
}): string | undefined {
  const base = params.basePrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
  const instructions: string[] = [];

  if (params.stopCondition?.trim()) {
    instructions.push(`Stop when: ${params.stopCondition.trim()}`);
  }

  if (params.outputFormat !== "text") {
    instructions.push("Return valid JSON only. No extra text.");
  }

  if (instructions.length === 0) {
    return base;
  }

  const instructionBlock = `<instructions>
${instructions.map((entry) => `- ${entry}`).join("\n")}
</instructions>`;

  return `${base}\n\n${instructionBlock}`;
}

function buildUserPrompt(prompt: string, input: unknown): string {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt is required");
  }

  const sections = [`<task>\n${trimmed}\n</task>`];
  const context = formatInputValue(input);
  if (context) {
    sections.push(`<context>\n${context}\n</context>`);
  }

  return sections.join("\n\n");
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

function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(JSON_FENCE_REGEX);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

function normalizeOutput(output: unknown, format: AgentOutputFormat): unknown {
  if (format === "text") {
    if (typeof output === "string") {
      return output;
    }
    if (output === undefined || output === null) {
      return "";
    }
    try {
      return JSON.stringify(output);
    } catch {
      return String(output);
    }
  }

  if (typeof output === "string") {
    const candidate = extractJsonCandidate(output);
    return JSON.parse(candidate);
  }

  return output;
}

function hasTools(config: AgentPlanConfig): boolean {
  switch (config.type) {
    case "llm":
      return (config.tools?.length ?? 0) > 0;
    case "sequential":
    case "parallel":
    case "loop":
      return config.subAgents.some(hasTools);
    case "coordinator":
      return config.subAgents.some((sub) => hasTools(sub));
    default: {
      const exhaustiveCheck: never = config;
      return exhaustiveCheck;
    }
  }
}

function applyOverrides(
  config: AgentPlanConfig,
  overrides: {
    name: string;
    model?: ModelConfig;
    temperature?: number;
    maxSteps?: number;
    tools?: string[] | undefined;
    buildSystemPrompt: (basePrompt?: string) => string | undefined;
  },
  isRoot: boolean
): AgentPlanConfig {
  const name = isRoot ? overrides.name : config.name;

  switch (config.type) {
    case "llm": {
      const updated: LlmAgentConfig = {
        ...config,
        name,
        maxSteps: overrides.maxSteps ?? config.maxSteps,
        tools: overrides.tools ?? config.tools,
        model: mergeModelConfig(
          config.model,
          overrides.model,
          overrides.temperature
        ),
        systemPrompt: overrides.buildSystemPrompt(config.systemPrompt),
      };
      return updated;
    }
    case "sequential":
      return {
        ...config,
        name,
        subAgents: config.subAgents.map((sub) =>
          applyOverrides(sub, overrides, false)
        ),
      };
    case "parallel":
      return {
        ...config,
        name,
        subAgents: config.subAgents.map((sub) =>
          applyOverrides(sub, overrides, false)
        ),
      };
    case "loop":
      return {
        ...config,
        name,
        subAgents: config.subAgents.map((sub) =>
          applyOverrides(sub, overrides, false)
        ),
      };
    case "coordinator": {
      const updatedSubs = config.subAgents.map((sub) => {
        const { matchCondition, ...rest } = sub;
        const updated = applyOverrides(rest, overrides, false);
        if (!matchCondition) {
          return updated;
        }
        return { ...updated, matchCondition };
      });
      return {
        ...config,
        name,
        subAgents: updatedSubs,
      };
    }
    default: {
      const exhaustiveCheck: never = config;
      return exhaustiveCheck;
    }
  }
}

function wrapWithExecutionMode(
  mode: AgentExecutionMode,
  baseConfig: AgentPlanConfig,
  name: string
): AgentPlanConfig {
  switch (mode) {
    case "react":
      return baseConfig;
    case "sequential":
      return composeAgents(name, [baseConfig]);
    case "parallel":
      return parallelizeAgents(name, [baseConfig]);
    case "hierarchical":
      return routeAgents(name, [baseConfig], baseConfig.name);
    default: {
      const exhaustiveCheck: never = mode;
      return exhaustiveCheck;
    }
  }
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

export const agentCallExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  const rawConfig = resolveNodeConfig(node.data);
  const rawRecord = isRecord(rawConfig) ? rawConfig : {};
  const config = AgentCallNodeConfigSchema.parse(rawConfig);

  try {
    if (!config.prompt.trim()) {
      throw new Error("Prompt is required");
    }

    const explicitTemperature = Object.hasOwn(rawRecord, "temperature");
    const explicitMaxSteps = Object.hasOwn(rawRecord, "maxSteps");
    const explicitTools = Object.hasOwn(rawRecord, "tools");
    const explicitModel = Object.hasOwn(rawRecord, "model");
    const explicitExecutionMode = Object.hasOwn(rawRecord, "executionMode");

    const agentId = normalizeAgentId(config.agentId);
    const preset = PRESET_CONFIGS.get(agentId);
    const baseName = config.agentName ?? config.agentId;
    const useDefaults = !preset;

    const baseConfig = preset
      ? cloneConfig(preset)
      : ({
          type: "llm",
          name: baseName,
          description: config.agentName ?? undefined,
          tools: config.tools,
          maxSteps: config.maxSteps,
          systemPrompt: config.systemPromptOverride ?? DEFAULT_SYSTEM_PROMPT,
          model: mergeModelConfig(
            undefined,
            explicitModel && config.model
              ? parseModel(config.model)
              : undefined,
            explicitTemperature || useDefaults ? config.temperature : undefined
          ),
        } satisfies LlmAgentConfig);

    const buildPrompt = (basePrompt?: string) =>
      buildSystemPrompt({
        basePrompt:
          config.systemPromptOverride ?? basePrompt ?? DEFAULT_SYSTEM_PROMPT,
        stopCondition: config.stopCondition,
        outputFormat: config.outputFormat,
      });

    const overrides = {
      name: baseName,
      model:
        explicitModel && config.model ? parseModel(config.model) : undefined,
      temperature:
        explicitTemperature || useDefaults ? config.temperature : undefined,
      maxSteps: explicitMaxSteps || useDefaults ? config.maxSteps : undefined,
      tools: explicitTools || useDefaults ? config.tools : undefined,
      buildSystemPrompt: buildPrompt,
    };

    const updatedBase = applyOverrides(baseConfig, overrides, true);

    const finalConfig =
      preset && !explicitExecutionMode && updatedBase.type !== "llm"
        ? updatedBase
        : wrapWithExecutionMode(config.executionMode, updatedBase, baseName);

    const toolsEnabled = hasTools(finalConfig);

    if (toolsEnabled) {
      if (!(context?.teamId && context?.triggeredById)) {
        throw new Error(
          "Tool context with teamId and userId is required when tools are enabled"
        );
      }
      await ensureToolsReady();
    }

    const memory =
      config.memoryEnabled && context?.teamId && context?.triggeredById
        ? await createMemoryAccess(
            memoryConsolidator,
            context.teamId,
            context.triggeredById
          )
        : undefined;

    const agentInput = buildUserPrompt(config.prompt, input);
    const sessionId = `canvas_${context?.executionId ?? node.id}_${node.id}_${Date.now()}`;

    const result = await runAgent(finalConfig, agentInput, {
      teamId: context?.teamId ?? "unknown",
      userId: context?.triggeredById ?? "unknown",
      sessionId,
      metadata: {
        executionId: context?.executionId,
        agentCanvasId: context?.agentCanvasId,
        nodeId: node.id,
        nodeType: node.type,
        triggerSource: context?.triggerSource,
      },
      memory,
    });

    return normalizeOutput(result.output, config.outputFormat);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
