const REDACTED_VALUE = "[REDACTED]";

const REDACT_KEYS = new Set([
  "authorization",
  "apikey",
  "accesstoken",
  "cookie",
  "password",
  "refreshtoken",
  "secret",
  "setcookie",
  "token",
]);

export const PINO_REDACT_PATHS = [
  "authorization",
  "apiKey",
  "accessToken",
  "cookie",
  "password",
  "refreshToken",
  "secret",
  "set-cookie",
  "token",
  "*.authorization",
  "*.cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
  "*.accessToken",
  "*.refreshToken",
] as const;

function normalizeKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function shouldRedactKey(key: string): boolean {
  return REDACT_KEYS.has(normalizeKey(key));
}

function redactInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item, seen));
  }

  const output: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    output[key] = shouldRedactKey(key)
      ? REDACTED_VALUE
      : redactInternal(nestedValue, seen);
  }

  return output;
}

export function redact(value: unknown): unknown {
  return redactInternal(value, new WeakSet<object>());
}
