import type {
  ConnectorActionError,
  ConnectorActionNodeConfig,
  RetryConfig,
} from "@openbeam/types/canvas";
import type {
  ConnectorActionDefinition,
  ConnectorActionInput,
} from "@openbeam/types/connector-actions";
import jmespath from "jmespath";
import type { CanvasNodeExecutionInput } from "../types";

const VARIABLE_REF = /^\s*{{\s*([^}]+)\s*}}\s*$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeConnectorType(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, "_");
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

function resolvePath(value: unknown, path: string): unknown {
  try {
    return jmespath.search(value ?? null, path);
  } catch {
    return;
  }
}

function resolveMappingValue(
  value: unknown,
  input: unknown,
  context: CanvasNodeExecutionInput["context"],
  node: CanvasNodeExecutionInput["node"]
): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const expression = normalizeVariableRef(value);
  if (!expression) {
    return value;
  }
  const direct = resolvePath(input, expression);
  if (direct !== undefined) {
    return direct;
  }
  const composite = {
    input,
    context,
    node: { id: node.id, type: node.type },
  };
  return resolvePath(composite, expression);
}

function normalizeEmpty(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return;
  }
  return value;
}

function parseJsonValue(value: unknown, label: string): unknown {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid JSON for ${label}`);
    }
  }
  return value;
}

function coerceInputValue(def: ConnectorActionInput, value: unknown): unknown {
  const resolved = normalizeEmpty(value);
  if (resolved === undefined) {
    return;
  }

  switch (def.type) {
    case "number": {
      if (typeof resolved === "number") {
        return resolved;
      }
      const num = Number(resolved);
      if (Number.isNaN(num)) {
        throw new Error(`${def.name} must be a number`);
      }
      return num;
    }
    case "boolean": {
      if (typeof resolved === "boolean") {
        return resolved;
      }
      if (typeof resolved === "string") {
        if (resolved.toLowerCase() === "true") {
          return true;
        }
        if (resolved.toLowerCase() === "false") {
          return false;
        }
      }
      return Boolean(resolved);
    }
    case "json":
    case "object":
    case "array":
      return parseJsonValue(resolved, def.name);
    case "date": {
      if (resolved instanceof Date) {
        return resolved.toISOString();
      }
      if (typeof resolved === "number") {
        return new Date(resolved).toISOString();
      }
      return String(resolved).trim();
    }
    default:
      return typeof resolved === "string" ? resolved.trim() : resolved;
  }
}

function validateValue(def: ConnectorActionInput, value: unknown): void {
  if (!def.validation || value === undefined || value === null) {
    return;
  }
  if (typeof value === "number") {
    if (def.validation.min !== undefined && value < def.validation.min) {
      throw new Error(`${def.name} must be >= ${def.validation.min}`);
    }
    if (def.validation.max !== undefined && value > def.validation.max) {
      throw new Error(`${def.name} must be <= ${def.validation.max}`);
    }
  }
  if (typeof value === "string") {
    if (
      def.validation.minLength !== undefined &&
      value.length < def.validation.minLength
    ) {
      throw new Error(`${def.name} is too short`);
    }
    if (
      def.validation.maxLength !== undefined &&
      value.length > def.validation.maxLength
    ) {
      throw new Error(`${def.name} is too long`);
    }
    if (def.validation.pattern) {
      const regex = new RegExp(def.validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`${def.name} is invalid`);
      }
    }
  }
}

export function buildActionInputs(params: {
  action: ConnectorActionDefinition;
  config: ConnectorActionNodeConfig;
  input: unknown;
  context: CanvasNodeExecutionInput["context"];
  node: CanvasNodeExecutionInput["node"];
}): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const def of params.action.inputs) {
    const rawMapping = params.config.inputMappings[def.id];
    const resolvedMapping = resolveMappingValue(
      rawMapping,
      params.input,
      params.context,
      params.node
    );
    const value =
      resolvedMapping === undefined
        ? def.default
        : coerceInputValue(def, resolvedMapping);

    if (value === undefined || value === null || value === "") {
      if (def.required) {
        throw new Error(`${def.name} is required`);
      }
      continue;
    }

    validateValue(def, value);
    resolved[def.id] = value;
  }

  return resolved;
}

export function sanitizeOutput(result: unknown): unknown {
  if (result === undefined) {
    return null;
  }
  return result;
}

function isConnectorError(
  error: unknown
): error is { code: string; message: string; retryable: boolean } {
  return (
    isRecord(error) &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.retryable === "boolean"
  );
}

export function toActionError(error: unknown): ConnectorActionError {
  if (isConnectorError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message,
      retryable: false,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: String(error ?? "Unknown error"),
    retryable: false,
  };
}

function shouldRetry(
  error: ConnectorActionError,
  config?: RetryConfig
): boolean {
  if (!config) {
    return false;
  }
  if (config.retryOnErrors && config.retryOnErrors.length > 0) {
    return config.retryOnErrors.includes(error.code);
  }
  return error.retryable;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await promise;
  }
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Action timed out"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function executeWithRetry<T>(params: {
  execute: () => Promise<T>;
  retryConfig?: RetryConfig;
  timeoutMs: number;
}): Promise<{ result: T; retryCount: number; durationMs: number }> {
  const retryConfig = params.retryConfig;
  const maxAttempts = retryConfig?.maxAttempts ?? 1;
  let attempt = 0;
  let backoff = retryConfig?.backoffMs ?? 1000;
  const startedAt = Date.now();

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await withTimeout(params.execute(), params.timeoutMs);
      return {
        result,
        retryCount: attempt - 1,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const actionError = toActionError(error);
      if (attempt >= maxAttempts || !shouldRetry(actionError, retryConfig)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, backoff));
      if (retryConfig?.exponential !== false) {
        backoff *= 2;
      }
    }
  }

  throw new Error("Action failed after retries");
}
