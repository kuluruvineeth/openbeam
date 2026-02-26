type CachedNativeHelperAccessibilityContext = {
  contextResult: unknown;
  capturedAtMs: number;
};

const DEFAULT_MAX_AGE_MS = 120_000;

let cachedContext: CachedNativeHelperAccessibilityContext | null = null;

function normalizeNowMs(nowMs?: number): number {
  if (typeof nowMs === "number" && Number.isFinite(nowMs)) {
    return Math.floor(nowMs);
  }
  return Date.now();
}

function normalizeMaxAgeMs(maxAgeMs?: number): number {
  if (
    typeof maxAgeMs !== "number" ||
    !Number.isFinite(maxAgeMs) ||
    maxAgeMs <= 0
  ) {
    return DEFAULT_MAX_AGE_MS;
  }
  return Math.floor(maxAgeMs);
}

export function rememberDictationNativeHelperAccessibilityContext(
  contextResult: unknown,
  capturedAtMs = Date.now()
): void {
  cachedContext = {
    contextResult,
    capturedAtMs: normalizeNowMs(capturedAtMs),
  };
}

export function clearDictationNativeHelperAccessibilityContext(): void {
  cachedContext = null;
}

export function getRecentDictationNativeHelperAccessibilityContext(params?: {
  nowMs?: number;
  maxAgeMs?: number;
}): unknown | null {
  if (!cachedContext) {
    return null;
  }

  const nowMs = normalizeNowMs(params?.nowMs);
  const maxAgeMs = normalizeMaxAgeMs(params?.maxAgeMs);
  const ageMs = nowMs - cachedContext.capturedAtMs;
  if (ageMs < 0 || ageMs > maxAgeMs) {
    return null;
  }

  return cachedContext.contextResult;
}
