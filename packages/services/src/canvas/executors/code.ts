import vm from "node:vm";
import {
  CodeNodeConfigSchema,
  type CodeVariableType,
  type OutputField,
} from "@openplane/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

type CodeVariable = {
  name: string;
  required: boolean;
  defaultValue?: unknown;
  sourcePath?: string;
};

type ExecutionContext = {
  input: unknown;
  vars: Record<string, unknown>;
  logs: Array<{
    level: "log" | "info" | "warn" | "error";
    message: string;
    timestamp: number;
  }>;
};

const IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const ARRAY_INDEX_PATTERN = /^\d+$/;
const RESERVED_NAMES = new Set([
  "input",
  "data",
  "$input",
  "$data",
  "vars",
  "console",
  "fetch",
  "process",
  "global",
]);

const BLOCKED_PROPERTIES = new Set(["constructor", "__proto__", "prototype"]);

const DANGEROUS_PATTERNS = [
  /\bconstructor\b/,
  /\b__proto__\b/,
  /\bprototype\b/,
  /\bprocess\b/,
  /\bglobal\b/,
  /\bglobalThis\b/,
  /\brequire\b/,
  /\bmodule\b/,
  /\beval\b/,
  /\bFunction\s*\(/,
];

function validateCodeSafety(code: string): { safe: boolean; reason?: string } {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      const match = code.match(pattern);
      return {
        safe: false,
        reason: `Code contains forbidden pattern: ${match?.[0] ?? "unknown"}`,
      };
    }
  }
  return { safe: true };
}

function createSafeProxy<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && BLOCKED_PROPERTIES.has(prop)) {
        return;
      }
      const value = Reflect.get(target, prop, receiver);
      if (value !== null && typeof value === "object") {
        return createSafeProxy(value);
      }
      return value;
    },
    has(target, prop) {
      if (typeof prop === "string" && BLOCKED_PROPERTIES.has(prop)) {
        return false;
      }
      return Reflect.has(target, prop);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (typeof prop === "string" && BLOCKED_PROPERTIES.has(prop)) {
        return;
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePath(path: string): string[] {
  const trimmed = path.trim();
  const normalized = trimmed.startsWith("$.") ? trimmed.slice(2) : trimmed;
  if (!normalized) {
    return [];
  }
  return normalized.split(".").filter(Boolean);
}

function getPathValue(input: unknown, path?: string): unknown {
  if (!path) {
    return input;
  }

  const parts = normalizePath(path);
  let current: unknown = input;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return;
    }

    if (Array.isArray(current) && ARRAY_INDEX_PATTERN.test(part)) {
      current = current[Number.parseInt(part, 10)];
      continue;
    }

    if (!isRecord(current)) {
      return;
    }

    current = current[part];
  }

  return current;
}

function buildVariables(
  input: unknown,
  variables: CodeVariable[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const variable of variables) {
    if (!variable.name.trim()) {
      continue;
    }

    const value =
      variable.sourcePath !== undefined
        ? getPathValue(input, variable.sourcePath)
        : getPathValue(input, variable.name);

    if (value !== undefined && value !== null) {
      result[variable.name] = value;
      continue;
    }

    if (variable.defaultValue !== undefined) {
      result[variable.name] = variable.defaultValue;
      continue;
    }

    if (variable.required) {
      missing.push(variable.name);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(", ")}`);
  }

  return result;
}

function formatLogArg(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createConsole(enabled: boolean, logs: ExecutionContext["logs"]) {
  const write =
    (level: "log" | "info" | "warn" | "error") =>
    (...args: unknown[]) => {
      if (!enabled) {
        return;
      }
      const message = args.map(formatLogArg).join(" ");
      logs.push({ level, message, timestamp: Date.now() });
    };

  return {
    log: write("log"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
  };
}

function buildContext(
  input: unknown,
  variables: CodeVariable[]
): ExecutionContext {
  const logs: ExecutionContext["logs"] = [];
  const vars = buildVariables(input, variables);
  return { input, vars, logs };
}

function getVariableBindings(vars: Record<string, unknown>): {
  names: string[];
  values: unknown[];
} {
  const names: string[] = [];
  const values: unknown[] = [];

  for (const [name, value] of Object.entries(vars)) {
    if (!IDENTIFIER_PATTERN.test(name) || RESERVED_NAMES.has(name)) {
      continue;
    }
    names.push(name);
    values.push(value);
  }

  return { names, values };
}

async function loadTypescript(): Promise<typeof import("typescript") | null> {
  try {
    return await import("typescript");
  } catch {
    return null;
  }
}

async function transpileTypescript(code: string): Promise<string> {
  const ts = await loadTypescript();
  if (!ts) {
    throw new Error("TypeScript runtime requires the typescript dependency");
  }

  const output = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      sourceMap: false,
    },
  });

  return output.outputText;
}

async function runJavascript(params: {
  code: string;
  context: ExecutionContext;
  timeoutMs: number;
  enableConsole: boolean;
  sandboxed: boolean;
}): Promise<unknown> {
  const { names, values } = getVariableBindings(params.context.vars);
  const consoleProxy = createConsole(params.enableConsole, params.context.logs);

  if (!params.sandboxed) {
    const fn = new Function(
      "input",
      "data",
      "$input",
      "$data",
      "vars",
      ...names,
      `"use strict"; return (async () => { ${params.code}\n })();`
    ) as (...args: unknown[]) => Promise<unknown>;

    return await runWithTimeout(
      fn(
        params.context.input,
        params.context.input,
        params.context.input,
        params.context.input,
        params.context.vars,
        ...values
      ),
      params.timeoutMs
    );
  }

  const safeInput =
    params.context.input !== null && typeof params.context.input === "object"
      ? createSafeProxy(params.context.input as object)
      : params.context.input;
  const safeVars = createSafeProxy(params.context.vars);

  const sandbox: Record<string, unknown> = {
    input: safeInput,
    data: safeInput,
    $input: safeInput,
    $data: safeInput,
    vars: safeVars,
    console: consoleProxy,
    fetch,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  for (const [key, value] of Object.entries(params.context.vars)) {
    if (RESERVED_NAMES.has(key) || !IDENTIFIER_PATTERN.test(key)) {
      continue;
    }
    sandbox[key] =
      value !== null && typeof value === "object"
        ? createSafeProxy(value as object)
        : value;
  }

  const safetyCheck = validateCodeSafety(params.code);
  if (!safetyCheck.safe) {
    throw new Error(safetyCheck.reason);
  }

  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
  });

  const script = new vm.Script(
    `"use strict"; (async (input, data, $input, $data, vars, ${names.join(
      ", "
    )}) => { ${params.code}\n })`
  );

  const fn = script.runInContext(context, {
    timeout: params.timeoutMs,
  }) as (...args: unknown[]) => Promise<unknown>;

  const safeValues = values.map((v) =>
    v !== null && typeof v === "object" ? createSafeProxy(v as object) : v
  );

  return await runWithTimeout(
    fn(safeInput, safeInput, safeInput, safeInput, safeVars, ...safeValues),
    params.timeoutMs
  );
}

function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Code execution timed out"));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function resolveOutputFields(fields: OutputField[]): OutputField[] {
  return fields.filter((field) => field.name.trim().length > 0);
}

function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

function isValueType(value: unknown, type: CodeVariableType): boolean {
  switch (type) {
    case "any":
      return true;
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isRecord(value);
    default:
      return false;
  }
}

function validateOutputSchema(output: unknown, fields: OutputField[]): void {
  const schema = resolveOutputFields(fields);
  if (schema.length === 0) {
    return;
  }
  if (output === undefined || output === null) {
    throw new Error("Code output is required to match the output schema");
  }
  if (!isRecord(output)) {
    throw new Error("Code output must be an object to match the output schema");
  }
  for (const field of schema) {
    const value = output[field.name];
    if (value === undefined || value === null) {
      if (field.nullable) {
        continue;
      }
      throw new Error(`Output field "${field.name}" is required`);
    }
    if (!isValueType(value, field.type)) {
      throw new Error(
        `Output field "${field.name}" expected ${field.type} but received ${describeValue(value)}`
      );
    }
  }
}

async function executeWithRetries(
  run: () => Promise<unknown>,
  maxRetries: number
): Promise<unknown> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      attempt += 1;
    }
  }

  throw lastError;
}

export const codeExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = CodeNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    if (!config.code?.trim()) {
      throw new Error("Code is required");
    }

    if (config.runtime !== "javascript" && config.runtime !== "typescript") {
      throw new Error(`Unsupported runtime: ${config.runtime}`);
    }

    const context = buildContext(input, config.inputVariables ?? []);
    const timeoutMs = config.timeoutMs ?? 30_000;

    const run = async () => {
      const code =
        config.runtime === "typescript"
          ? await transpileTypescript(config.code)
          : config.code;

      const output = await runJavascript({
        code,
        context,
        timeoutMs,
        enableConsole: config.enableConsole ?? true,
        sandboxed: config.sandboxed ?? true,
      });

      validateOutputSchema(output, config.outputSchema ?? []);
      return output;
    };

    const maxRetries = config.retryOnError ? (config.maxRetries ?? 0) : 0;
    return await executeWithRetries(run, Math.max(0, maxRetries));
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
