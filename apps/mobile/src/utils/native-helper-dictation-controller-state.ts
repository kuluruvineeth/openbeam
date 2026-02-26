export type NativeHelperDictationMode = "idle" | "ptt" | "hands-free";

export type NativeHelperDictationControllerState = {
  mode: NativeHelperDictationMode;
  recordingStartedAtMs: number | null;
  quickReleaseCancelPending: boolean;
};

export type NativeHelperDictationControllerEvent =
  | "ptt-press"
  | "ptt-release"
  | "toggle"
  | "quick-release-timeout";

export type NativeHelperDictationControllerIntent =
  | "none"
  | "start-ptt"
  | "start-hands-free"
  | "stop"
  | "cancel";

export type NativeHelperDictationControllerStepResult = {
  state: NativeHelperDictationControllerState;
  intent: NativeHelperDictationControllerIntent;
  scheduleQuickReleaseCancelTimer: boolean;
  clearQuickReleaseCancelTimer: boolean;
};

type AdvanceParams = {
  state: NativeHelperDictationControllerState;
  event: NativeHelperDictationControllerEvent;
  nowMs?: number;
  isRecordingActive: boolean;
  quickActionThresholdMs: number;
};

export function createNativeHelperDictationControllerState(): NativeHelperDictationControllerState {
  return {
    mode: "idle",
    recordingStartedAtMs: null,
    quickReleaseCancelPending: false,
  };
}

function normalizeNowMs(nowMs?: number): number {
  if (!Number.isFinite(nowMs) || nowMs === undefined) {
    return Date.now();
  }
  return Math.floor(nowMs);
}

function isQuickAction(params: {
  startedAtMs: number | null;
  nowMs: number;
  thresholdMs: number;
}): boolean {
  const { startedAtMs, nowMs, thresholdMs } = params;
  if (!Number.isFinite(thresholdMs) || thresholdMs < 0) {
    return false;
  }
  if (typeof startedAtMs !== "number" || !Number.isFinite(startedAtMs)) {
    return false;
  }
  const elapsed = nowMs - startedAtMs;
  return elapsed >= 0 && elapsed <= thresholdMs;
}

function resolveEffectiveMode(params: {
  mode: NativeHelperDictationMode;
  isRecordingActive: boolean;
}): NativeHelperDictationMode {
  const { mode, isRecordingActive } = params;
  if (mode === "idle" && isRecordingActive) {
    // Dictation can be started from the mic button without shortcut controller awareness.
    return "hands-free";
  }
  return mode;
}

export function advanceNativeHelperDictationControllerState(
  params: AdvanceParams
): NativeHelperDictationControllerStepResult {
  const nowMs = normalizeNowMs(params.nowMs);
  const thresholdMs = Math.max(0, Math.floor(params.quickActionThresholdMs));
  const nextState: NativeHelperDictationControllerState = {
    ...params.state,
  };
  const effectiveMode = resolveEffectiveMode({
    mode: nextState.mode,
    isRecordingActive: params.isRecordingActive,
  });

  const resultBase = {
    state: nextState,
    intent: "none" as const,
    scheduleQuickReleaseCancelTimer: false,
    clearQuickReleaseCancelTimer: false,
  };

  if (params.event === "quick-release-timeout") {
    if (!nextState.quickReleaseCancelPending) {
      return resultBase;
    }
    nextState.quickReleaseCancelPending = false;
    nextState.mode = "idle";
    nextState.recordingStartedAtMs = null;
    return {
      ...resultBase,
      intent: "cancel",
      clearQuickReleaseCancelTimer: true,
    };
  }

  const quickAction = isQuickAction({
    startedAtMs: nextState.recordingStartedAtMs,
    nowMs,
    thresholdMs,
  });

  if (params.event === "ptt-press") {
    if (nextState.quickReleaseCancelPending) {
      nextState.quickReleaseCancelPending = false;
      nextState.mode = "hands-free";
      return {
        ...resultBase,
        clearQuickReleaseCancelTimer: true,
      };
    }

    if (effectiveMode === "idle") {
      nextState.mode = "ptt";
      nextState.recordingStartedAtMs = nowMs;
      return {
        ...resultBase,
        intent: "start-ptt",
      };
    }

    if (effectiveMode === "hands-free") {
      nextState.quickReleaseCancelPending = false;
      nextState.mode = "idle";
      nextState.recordingStartedAtMs = null;
      return {
        ...resultBase,
        intent: quickAction ? "cancel" : "stop",
        clearQuickReleaseCancelTimer: true,
      };
    }

    return resultBase;
  }

  if (params.event === "ptt-release") {
    if (effectiveMode !== "ptt") {
      return resultBase;
    }

    if (quickAction) {
      nextState.quickReleaseCancelPending = true;
      return {
        ...resultBase,
        scheduleQuickReleaseCancelTimer: true,
      };
    }

    nextState.quickReleaseCancelPending = false;
    nextState.mode = "idle";
    nextState.recordingStartedAtMs = null;
    return {
      ...resultBase,
      intent: "stop",
      clearQuickReleaseCancelTimer: true,
    };
  }

  if (nextState.quickReleaseCancelPending) {
    nextState.quickReleaseCancelPending = false;
    nextState.mode = "hands-free";
    return {
      ...resultBase,
      clearQuickReleaseCancelTimer: true,
    };
  }

  if (effectiveMode === "idle") {
    nextState.mode = "hands-free";
    nextState.recordingStartedAtMs = nowMs;
    return {
      ...resultBase,
      intent: "start-hands-free",
    };
  }

  if (effectiveMode === "ptt") {
    nextState.mode = "hands-free";
    return resultBase;
  }

  nextState.mode = "idle";
  nextState.recordingStartedAtMs = null;
  return {
    ...resultBase,
    intent: quickAction ? "cancel" : "stop",
  };
}
