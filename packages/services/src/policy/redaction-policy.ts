import type { RuntimeEventPayload } from "@openbeam/types/canvas/runtime-events";

const SENSITIVE_TOOL_NAMES = new Set([
  "connector_oauth_refresh",
  "connector_credentials",
  "api_key_rotate",
]);

const SENSITIVE_FIELD_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
];

const REDACTED = "[REDACTED]";

export function shouldRedactTool(toolName: string): boolean {
  return SENSITIVE_TOOL_NAMES.has(toolName);
}

function containsSensitiveKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function redactObject(value: unknown): {
  redacted: unknown;
  redactionKeys: string[];
} {
  if (value === null || value === undefined || typeof value !== "object") {
    return { redacted: value, redactionKeys: [] };
  }

  if (Array.isArray(value)) {
    const keys: string[] = [];
    const redacted = value.map((item) => {
      const result = redactObject(item);
      keys.push(...result.redactionKeys);
      return result.redacted;
    });
    return { redacted, redactionKeys: keys };
  }

  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  const keys: string[] = [];

  for (const [k, v] of Object.entries(record)) {
    if (containsSensitiveKey(k)) {
      redacted[k] = REDACTED;
      keys.push(k);
    } else if (typeof v === "object" && v !== null) {
      const nested = redactObject(v);
      redacted[k] = nested.redacted;
      keys.push(...nested.redactionKeys);
    } else {
      redacted[k] = v;
    }
  }

  return { redacted, redactionKeys: keys };
}

export function redactToolPayload(
  payload: RuntimeEventPayload
): RuntimeEventPayload {
  if (payload.type === "tool.call_start") {
    if (shouldRedactTool(payload.toolName) && payload.toolInput !== undefined) {
      const { redacted, redactionKeys } = redactObject(payload.toolInput);
      return {
        ...payload,
        toolInput: redacted,
        redacted: redactionKeys.length > 0,
        redactionKeys: redactionKeys.length > 0 ? redactionKeys : undefined,
      };
    }

    if (payload.toolInput !== undefined) {
      const { redacted, redactionKeys } = redactObject(payload.toolInput);
      if (redactionKeys.length > 0) {
        return {
          ...payload,
          toolInput: redacted,
          redacted: true,
          redactionKeys,
        };
      }
    }

    return payload;
  }

  if (payload.type === "tool.call_result") {
    if (
      shouldRedactTool(payload.toolName) &&
      payload.toolOutput !== undefined
    ) {
      return {
        ...payload,
        toolOutput: REDACTED,
        redacted: true,
        redactionKeys: ["toolOutput"],
      };
    }

    if (payload.toolOutput !== undefined) {
      const { redacted, redactionKeys } = redactObject(payload.toolOutput);
      if (redactionKeys.length > 0) {
        return {
          ...payload,
          toolOutput: redacted,
          redacted: true,
          redactionKeys,
        };
      }
    }

    return payload;
  }

  return payload;
}
