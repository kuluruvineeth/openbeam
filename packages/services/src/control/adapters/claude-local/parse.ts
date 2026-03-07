import type { AdapterUsageSummary } from "@openbeam/types/control/adapters";

export interface ClaudeStreamEvent {
  type: string;
  sessionId?: string;
  usage?: AdapterUsageSummary;
  costUsd?: number;
  model?: string;
  text?: string;
  error?: string;
  toolName?: string;
  toolInput?: unknown;
  toolUseId?: string;
  toolResult?: string;
  isError?: boolean;
  subtype?: string;
}

export function parseStreamJsonLine(line: string): ClaudeStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const type = typeof parsed.type === "string" ? parsed.type : "";

  if (type === "system") {
    return {
      type: "system",
      sessionId: extractString(parsed, "session_id"),
      model: extractString(parsed, "model"),
    };
  }

  if (type === "result") {
    return {
      type: "result",
      subtype: extractString(parsed, "subtype"),
      text: extractString(parsed, "result"),
      usage: extractUsage(parsed),
      costUsd: extractNumber(parsed, "cost_usd"),
      model: extractString(parsed, "model"),
      error: extractString(parsed, "error"),
      isError: parsed.is_error === true,
    };
  }

  if (type === "assistant") {
    return {
      type: "assistant",
      text: extractString(parsed, "message"),
    };
  }

  if (type === "tool_use") {
    return {
      type: "tool_use",
      toolName: extractString(parsed, "name"),
      toolInput: parsed.input,
      toolUseId: extractString(parsed, "tool_use_id"),
    };
  }

  if (type === "tool_result") {
    return {
      type: "tool_result",
      toolUseId: extractString(parsed, "tool_use_id"),
      toolResult: extractString(parsed, "content"),
      isError: parsed.is_error === true,
    };
  }

  if (type === "error") {
    return {
      type: "error",
      error: extractString(parsed, "error") || extractString(parsed, "message"),
    };
  }

  return { type };
}

function extractString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

function extractNumber(
  obj: Record<string, unknown>,
  key: string
): number | undefined {
  const value = obj[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function extractUsage(
  obj: Record<string, unknown>
): AdapterUsageSummary | undefined {
  const usage = obj.usage;
  if (!usage || typeof usage !== "object") {
    return;
  }

  const u = usage as Record<string, unknown>;
  const input = typeof u.input_tokens === "number" ? u.input_tokens : 0;
  const output = typeof u.output_tokens === "number" ? u.output_tokens : 0;
  const cached =
    typeof u.cache_read_input_tokens === "number"
      ? u.cache_read_input_tokens
      : undefined;

  return {
    inputTokens: input,
    outputTokens: output,
    cachedInputTokens: cached,
  };
}
