import type { AdapterUsageSummary } from "@openbeam/types/control/adapters";

export interface CodexStreamEvent {
  type: string;
  sessionId?: string;
  usage?: AdapterUsageSummary;
  model?: string;
  text?: string;
  error?: string;
}

export function parseCodexJsonLine(line: string): CodexStreamEvent | null {
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

  if (type === "session") {
    return {
      type: "session",
      sessionId: extractString(parsed, "session_id"),
    };
  }

  if (type === "result" || type === "completed") {
    return {
      type: "result",
      text: extractString(parsed, "result") || extractString(parsed, "output"),
      usage: extractUsage(parsed),
      model: extractString(parsed, "model"),
    };
  }

  if (type === "message" || type === "assistant") {
    return {
      type: "assistant",
      text:
        extractString(parsed, "content") || extractString(parsed, "message"),
    };
  }

  if (type === "error") {
    return {
      type: "error",
      error: extractString(parsed, "error") || extractString(parsed, "message"),
    };
  }

  if (parsed.session_id) {
    return {
      type,
      sessionId: extractString(parsed, "session_id"),
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
    typeof u.cached_tokens === "number" ? u.cached_tokens : undefined;

  return {
    inputTokens: input,
    outputTokens: output,
    cachedInputTokens: cached,
  };
}
