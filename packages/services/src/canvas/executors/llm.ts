import {
  type AISDKToolSet,
  type CompletionOptions,
  CompletionService,
  registerAllTools,
  type ToolContext,
  toolRegistry,
} from "@openplane/ai";
import {
  type ChatMessage,
  getChatModel,
  type ProviderId,
  ProviderIdSchema,
  type ToolContextBase,
  ToolContextSchema,
} from "@openplane/types/ai";
import { LlmNodeConfigSchema } from "@openplane/types/canvas";
import Ajv, { type ValidateFunction } from "ajv";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaCache = new WeakMap<object, ValidateFunction>();
const schemaStringCache = new Map<string, ValidateFunction>();
const messageRoles = new Set(["system", "user", "assistant", "tool"]);
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

function parseModel(model: string): {
  providerId?: ProviderId;
  modelId: string;
} {
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

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) {
    return false;
  }
  if (!messageRoles.has(String(value.role ?? ""))) {
    return false;
  }
  if (typeof value.content !== "string") {
    return false;
  }
  if (value.name !== undefined && typeof value.name !== "string") {
    return false;
  }
  if (value.toolCallId !== undefined && typeof value.toolCallId !== "string") {
    return false;
  }
  return true;
}

function toPromptText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function selectPromptValue(record: Record<string, unknown>): unknown {
  const candidates = [
    record.prompt,
    record.input,
    record.text,
    record.content,
    record.message,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }

  return;
}

function stripContextFields(
  record: Record<string, unknown>
): Record<string, unknown> {
  const {
    toolContext: _toolContext,
    context: _context,
    messages: _messages,
    ...rest
  } = record;
  return rest;
}

function extractMessages(input: unknown): ChatMessage[] {
  if (Array.isArray(input) && input.every(isChatMessage)) {
    return input;
  }

  if (isRecord(input)) {
    const messages = input.messages;
    if (Array.isArray(messages) && messages.every(isChatMessage)) {
      return messages;
    }

    const promptValue = selectPromptValue(input);
    if (promptValue !== undefined) {
      return [{ role: "user", content: toPromptText(promptValue) }];
    }

    const sanitized = stripContextFields(input);
    if (Object.keys(sanitized).length > 0) {
      return [{ role: "user", content: toPromptText(sanitized) }];
    }

    throw new Error("Prompt is required");
  }

  if (input === undefined || input === null) {
    throw new Error("Prompt is required");
  }

  return [{ role: "user", content: toPromptText(input) }];
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

function buildToolContext(input: unknown): ToolContext | null {
  const base = extractToolContext(input);
  if (!base) {
    return null;
  }
  return {
    ...base,
    services: toolRegistry.getServices(),
  };
}

function buildToolSet(toolNames: string[]): AISDKToolSet {
  const tools: AISDKToolSet = {};
  const missing: string[] = [];

  for (const name of toolNames) {
    const tool = toolRegistry.getTool(name);
    if (!tool) {
      missing.push(name);
      continue;
    }
    tools[name] = tool;
  }

  if (missing.length > 0) {
    throw new Error(`Unknown tools: ${missing.join(", ")}`);
  }

  return tools;
}

function buildSystemPrompt(
  basePrompt: string | undefined,
  formatInstruction?: string
): string | undefined {
  const trimmedBase = basePrompt?.trim();
  const parts = [trimmedBase, formatInstruction].filter(
    (part): part is string => Boolean(part?.trim())
  );
  if (parts.length === 0) {
    return;
  }
  return parts.join("\n\n");
}

function buildFormatInstruction(params: {
  responseFormat: "text" | "json" | "structured";
  schemaText?: string;
}): string | undefined {
  if (params.responseFormat === "text") {
    return;
  }
  if (params.responseFormat === "json") {
    return "Return a valid JSON value. Do not include markdown or extra text.";
  }
  if (!params.schemaText) {
    throw new Error("Output schema is required for structured responses");
  }
  return `Return a valid JSON value that matches this JSON schema:\n${params.schemaText}\nDo not include any extra text.`;
}

function getSchemaValidator(
  schema: object,
  schemaKey?: string
): ValidateFunction {
  if (schemaKey) {
    const cached = schemaStringCache.get(schemaKey);
    if (cached) {
      return cached;
    }
  }

  const cached = schemaCache.get(schema);
  if (cached) {
    return cached;
  }

  const validator = ajv.compile(schema);
  schemaCache.set(schema, validator);
  if (schemaKey) {
    schemaStringCache.set(schemaKey, validator);
  }
  return validator;
}

function normalizeSchema(schemaInput: unknown): {
  schema: object;
  schemaText: string;
  validator: ValidateFunction;
} {
  if (schemaInput === undefined || schemaInput === null) {
    throw new Error("Output schema is required for structured responses");
  }

  if (typeof schemaInput === "string") {
    const trimmed = schemaInput.trim();
    if (!trimmed) {
      throw new Error("Output schema is required for structured responses");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid output schema JSON: ${message}`);
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Output schema must be a JSON object");
    }
    const schema = parsed as object;
    return {
      schema,
      schemaText: JSON.stringify(schema, null, 2),
      validator: getSchemaValidator(schema, trimmed),
    };
  }

  if (!schemaInput || typeof schemaInput !== "object") {
    throw new Error("Output schema must be a JSON object");
  }

  const schema = schemaInput as object;
  return {
    schema,
    schemaText: JSON.stringify(schema, null, 2),
    validator: getSchemaValidator(schema),
  };
}

function findJsonStart(text: string): number {
  const brace = text.indexOf("{");
  const bracket = text.indexOf("[");
  if (brace === -1) {
    return bracket;
  }
  if (bracket === -1) {
    return brace;
  }
  return Math.min(brace, bracket);
}

function findJsonEnd(text: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = stack.pop();
      if (expected !== char) {
        return -1;
      }
      if (stack.length === 0) {
        return i;
      }
    }
  }

  return -1;
}

function extractJsonCandidate(response: string): string {
  const trimmed = response.trim();
  if (!trimmed) {
    throw new Error("LLM returned an empty response");
  }

  const fenced = JSON_FENCE_REGEX.exec(trimmed);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = findJsonStart(trimmed);
  if (start === -1) {
    return trimmed;
  }

  const end = findJsonEnd(trimmed, start);
  if (end === -1) {
    return trimmed.slice(start);
  }

  return trimmed.slice(start, end + 1);
}

function parseJsonOutput(response: string): unknown {
  const candidate = extractJsonCandidate(response);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON response: ${message}`);
  }
}

function validateStructuredOutput(
  value: unknown,
  validator: ValidateFunction
): void {
  const valid = validator(value);
  if (valid) {
    return;
  }

  const details = ajv.errorsText(validator.errors, { separator: "; " });
  if (details) {
    throw new Error(`Output does not match schema: ${details}`);
  }

  throw new Error("Output does not match schema");
}

function finalizeOutput(params: {
  responseFormat: "text" | "json" | "structured";
  response: string;
  validator?: ValidateFunction;
}): unknown {
  if (params.responseFormat === "text") {
    return params.response;
  }

  const parsed = parseJsonOutput(params.response);

  if (params.responseFormat === "json") {
    return parsed;
  }

  if (!params.validator) {
    throw new Error("Output schema validator is missing");
  }

  validateStructuredOutput(parsed, params.validator);
  return parsed;
}

async function completeStreaming(
  completion: CompletionService,
  messages: ChatMessage[],
  options: CompletionOptions
): Promise<{ content: string }> {
  let content = "";
  for await (const chunk of completion.stream(messages, options)) {
    if (chunk.type === "done") {
      content = chunk.content ?? content;
      break;
    }
    if (chunk.type === "text" && chunk.content) {
      content += chunk.content;
    }
  }
  return { content };
}

export const llmExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = LlmNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const { providerId, modelId } = parseModel(config.model);
    const responseFormat = config.responseFormat ?? "text";
    const schemaInfo =
      responseFormat === "structured"
        ? normalizeSchema(config.outputSchema)
        : null;
    const systemPrompt = buildSystemPrompt(
      config.systemPrompt,
      buildFormatInstruction({
        responseFormat,
        schemaText: schemaInfo?.schemaText,
      })
    );
    const messages = extractMessages(input);

    const completion = new CompletionService();
    const options = {
      providerId,
      modelId,
      systemPrompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty,
      stopSequences: config.stop,
    };

    let result: { content: string };
    const enableStreaming = Boolean(
      config.streaming && (!config.tools || config.tools.length === 0)
    );

    if (config.tools && config.tools.length > 0) {
      await ensureToolsReady();
      const toolContext = buildToolContext(input);
      if (!toolContext) {
        throw new Error(
          "Tool context with teamId and userId is required when tools are enabled"
        );
      }
      const tools = buildToolSet(config.tools);
      result = await toolRegistry.runWithContextAsync(toolContext, () =>
        completion.complete(messages, { ...options, tools })
      );
    } else if (enableStreaming) {
      result = await completeStreaming(completion, messages, options);
    } else {
      result = await completion.complete(messages, options);
    }

    return finalizeOutput({
      responseFormat,
      response: result.content,
      validator: schemaInfo?.validator,
    });
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
