const BLOCKED_PROTOCOLS = new Set([
  "file:",
  "javascript:",
  "data:",
  "vbscript:",
]);

const INTERNAL_NETWORK_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  /^localhost$/i,
  /^::1$/,
  /^\[::1\]$/,
];

const MAX_NAVIGATIONS_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;
const navigationBuckets = new Map<string, number[]>();
const DEFAULT_BUCKET = "__global__";

export function validateUrl(
  url: string,
  allowInternal = false
): { valid: true; parsed: URL } | { valid: false; reason: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, reason: "URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: `Invalid URL: ${trimmed}` };
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
    return {
      valid: false,
      reason: `Protocol "${parsed.protocol}" is not allowed`,
    };
  }

  if (!allowInternal) {
    const hostname = parsed.hostname;
    for (const pattern of INTERNAL_NETWORK_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          reason: `Access to internal network address "${hostname}" is blocked`,
        };
      }
    }
  }

  return { valid: true, parsed };
}

export function checkNavigationRateLimit(sessionId?: string): {
  allowed: boolean;
  remaining: number;
} {
  const key = sessionId ?? DEFAULT_BUCKET;
  let timestamps = navigationBuckets.get(key);
  if (!timestamps) {
    timestamps = [];
    navigationBuckets.set(key, timestamps);
  }

  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;

  let first = timestamps[0];
  while (first !== undefined && first < cutoff) {
    timestamps.shift();
    first = timestamps[0];
  }

  if (timestamps.length >= MAX_NAVIGATIONS_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_NAVIGATIONS_PER_MINUTE - timestamps.length,
  };
}

export function clampTimeout(
  value: number | undefined,
  defaultMs = 30_000
): number {
  if (value === undefined) {
    return defaultMs;
  }
  return Math.max(1000, Math.min(120_000, Math.floor(value)));
}

export function resetRateLimit(sessionId?: string): void {
  if (sessionId) {
    navigationBuckets.delete(sessionId);
  } else {
    navigationBuckets.clear();
  }
}
