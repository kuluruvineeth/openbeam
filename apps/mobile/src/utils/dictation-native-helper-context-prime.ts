import {
  clearDictationNativeHelperAccessibilityContext,
  rememberDictationNativeHelperAccessibilityContext,
} from "@/utils/dictation-native-helper-context-cache";

type DictationNativeHelperContextPrimeClient = {
  isConnected: boolean;
  getNativeHelperAccessibilityContext: (options?: {
    editableOnly?: boolean;
    timeoutMs?: number;
  }) => Promise<unknown>;
};

type DictationNativeHelperContextPrimeWarnFn = (
  message: string,
  error?: unknown
) => void;

const DEFAULT_PRIME_TIMEOUT_MS = 250;

function normalizeTimeoutMs(timeoutMs?: number): number {
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs === undefined ||
    timeoutMs <= 0
  ) {
    return DEFAULT_PRIME_TIMEOUT_MS;
  }
  return Math.floor(timeoutMs);
}

export async function primeDictationNativeHelperAccessibilityContext(params: {
  enabled: boolean;
  client: DictationNativeHelperContextPrimeClient | null;
  timeoutMs?: number;
  onWarn?: DictationNativeHelperContextPrimeWarnFn;
}): Promise<boolean> {
  const { enabled, client, timeoutMs, onWarn } = params;
  if (!(enabled && client?.isConnected)) {
    return false;
  }

  try {
    clearDictationNativeHelperAccessibilityContext();
    const contextResult = await client.getNativeHelperAccessibilityContext({
      editableOnly: false,
      timeoutMs: normalizeTimeoutMs(timeoutMs),
    });
    rememberDictationNativeHelperAccessibilityContext(contextResult);
    return true;
  } catch (error) {
    onWarn?.("Failed to prime native helper accessibility context", error);
    return false;
  }
}
