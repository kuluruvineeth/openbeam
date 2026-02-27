import { describe, expect, it } from "vitest";

import {
  advanceNativeHelperDictationControllerState,
  createNativeHelperDictationControllerState,
} from "./native-helper-dictation-controller-state";

const QUICK_THRESHOLD_MS = 500;

describe("native-helper-dictation-controller-state", () => {
  it("starts PTT recording on press from idle", () => {
    const result = advanceNativeHelperDictationControllerState({
      state: createNativeHelperDictationControllerState(),
      event: "ptt-press",
      nowMs: 1000,
      isRecordingActive: false,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("start-ptt");
    expect(result.state.mode).toBe("ptt");
    expect(result.state.recordingStartedAtMs).toBe(1000);
  });

  it("schedules quick-release cancel when PTT releases quickly", () => {
    const initial = {
      ...createNativeHelperDictationControllerState(),
      mode: "ptt" as const,
      recordingStartedAtMs: 1000,
    };

    const result = advanceNativeHelperDictationControllerState({
      state: initial,
      event: "ptt-release",
      nowMs: 1200,
      isRecordingActive: true,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("none");
    expect(result.scheduleQuickReleaseCancelTimer).toBe(true);
    expect(result.state.quickReleaseCancelPending).toBe(true);
    expect(result.state.mode).toBe("ptt");
  });

  it("cancels on quick-release timeout when pending", () => {
    const initial = {
      ...createNativeHelperDictationControllerState(),
      mode: "ptt" as const,
      recordingStartedAtMs: 1000,
      quickReleaseCancelPending: true,
    };

    const result = advanceNativeHelperDictationControllerState({
      state: initial,
      event: "quick-release-timeout",
      nowMs: 1550,
      isRecordingActive: true,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("cancel");
    expect(result.clearQuickReleaseCancelTimer).toBe(true);
    expect(result.state.mode).toBe("idle");
    expect(result.state.recordingStartedAtMs).toBeNull();
    expect(result.state.quickReleaseCancelPending).toBe(false);
  });

  it("turns quick-release second press into hands-free latch", () => {
    const initial = {
      ...createNativeHelperDictationControllerState(),
      mode: "ptt" as const,
      recordingStartedAtMs: 1000,
      quickReleaseCancelPending: true,
    };

    const result = advanceNativeHelperDictationControllerState({
      state: initial,
      event: "ptt-press",
      nowMs: 1300,
      isRecordingActive: true,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("none");
    expect(result.clearQuickReleaseCancelTimer).toBe(true);
    expect(result.state.mode).toBe("hands-free");
    expect(result.state.quickReleaseCancelPending).toBe(false);
  });

  it("toggle switches PTT mode to hands-free without stopping", () => {
    const initial = {
      ...createNativeHelperDictationControllerState(),
      mode: "ptt" as const,
      recordingStartedAtMs: 1000,
    };

    const result = advanceNativeHelperDictationControllerState({
      state: initial,
      event: "toggle",
      nowMs: 1700,
      isRecordingActive: true,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("none");
    expect(result.state.mode).toBe("hands-free");
  });

  it("toggle starts hands-free from idle", () => {
    const result = advanceNativeHelperDictationControllerState({
      state: createNativeHelperDictationControllerState(),
      event: "toggle",
      nowMs: 2000,
      isRecordingActive: false,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("start-hands-free");
    expect(result.state.mode).toBe("hands-free");
    expect(result.state.recordingStartedAtMs).toBe(2000);
  });

  it("toggle in hands-free during quick window cancels", () => {
    const initial = {
      ...createNativeHelperDictationControllerState(),
      mode: "hands-free" as const,
      recordingStartedAtMs: 2000,
    };

    const result = advanceNativeHelperDictationControllerState({
      state: initial,
      event: "toggle",
      nowMs: 2200,
      isRecordingActive: true,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("cancel");
    expect(result.state.mode).toBe("idle");
  });

  it("treats externally active recording as hands-free when controller is idle", () => {
    const result = advanceNativeHelperDictationControllerState({
      state: createNativeHelperDictationControllerState(),
      event: "toggle",
      nowMs: 3000,
      isRecordingActive: true,
      quickActionThresholdMs: QUICK_THRESHOLD_MS,
    });

    expect(result.intent).toBe("stop");
    expect(result.state.mode).toBe("idle");
  });
});
