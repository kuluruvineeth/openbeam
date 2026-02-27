const DEFAULT_AUTOPASTE_WINDOW_MS = 90_000;

type DictationNativeHelperAutoPasteState = {
  requestedAtMs: number | null;
};

export function createDictationNativeHelperAutoPasteState(): DictationNativeHelperAutoPasteState {
  return {
    requestedAtMs: null,
  };
}

export function requestDictationNativeHelperAutoPaste(
  state: DictationNativeHelperAutoPasteState,
  nowMs = Date.now()
): void {
  state.requestedAtMs = Number.isFinite(nowMs) ? Math.floor(nowMs) : Date.now();
}

export function clearDictationNativeHelperAutoPaste(
  state: DictationNativeHelperAutoPasteState
): void {
  state.requestedAtMs = null;
}

export function consumeDictationNativeHelperAutoPaste(params: {
  state: DictationNativeHelperAutoPasteState;
  nowMs?: number;
  windowMs?: number;
}): boolean {
  const {
    state,
    nowMs = Date.now(),
    windowMs = DEFAULT_AUTOPASTE_WINDOW_MS,
  } = params;
  const requestedAtMs = state.requestedAtMs;
  state.requestedAtMs = null;

  if (requestedAtMs === null) {
    return false;
  }

  const normalizedNowMs = Number.isFinite(nowMs)
    ? Math.floor(nowMs)
    : Date.now();
  if (normalizedNowMs < requestedAtMs) {
    return false;
  }

  const normalizedWindowMs =
    Number.isFinite(windowMs) && windowMs > 0 ? Math.floor(windowMs) : 0;
  if (normalizedWindowMs <= 0) {
    return false;
  }

  return normalizedNowMs - requestedAtMs <= normalizedWindowMs;
}

const globalDictationNativeHelperAutoPasteState =
  createDictationNativeHelperAutoPasteState();

export function requestGlobalDictationNativeHelperAutoPaste(
  nowMs = Date.now()
): void {
  requestDictationNativeHelperAutoPaste(
    globalDictationNativeHelperAutoPasteState,
    nowMs
  );
}

export function clearGlobalDictationNativeHelperAutoPaste(): void {
  clearDictationNativeHelperAutoPaste(
    globalDictationNativeHelperAutoPasteState
  );
}

export function consumeGlobalDictationNativeHelperAutoPaste(params?: {
  nowMs?: number;
  windowMs?: number;
}): boolean {
  return consumeDictationNativeHelperAutoPaste({
    state: globalDictationNativeHelperAutoPasteState,
    nowMs: params?.nowMs,
    windowMs: params?.windowMs,
  });
}

export function resetGlobalDictationNativeHelperAutoPasteForTests(): void {
  clearDictationNativeHelperAutoPaste(
    globalDictationNativeHelperAutoPasteState
  );
}

export function getGlobalDictationNativeHelperAutoPasteRequestedAtForTests():
  | number
  | null {
  return globalDictationNativeHelperAutoPasteState.requestedAtMs;
}
