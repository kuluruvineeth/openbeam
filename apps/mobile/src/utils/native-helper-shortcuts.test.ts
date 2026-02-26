import { afterEach, describe, expect, it, vi } from "vitest";

// biome-ignore lint/suspicious/useAwait: async signature required by interface
async function loadModuleForPlatform(platform: "web" | "ios" | "android") {
  vi.resetModules();
  vi.doMock("react-native", () => ({ Platform: { OS: platform } }));
  return import("./native-helper-shortcuts");
}

describe("native-helper-shortcuts", () => {
  afterEach(() => {
    vi.doUnmock("react-native");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("emits push-to-talk state changes for subset matches", async () => {
    const { NativeHelperShortcutStateMachine } =
      await loadModuleForPlatform("web");
    const machine = new NativeHelperShortcutStateMachine({
      pushToTalk: [63],
      toggleRecording: [63, 49],
      pasteLastTranscript: [55, 59, 9],
      newNote: [55, 59, 45],
    });

    expect(machine.handleKeyDown(63)).toEqual([
      { type: "ptt-state-changed", isPressed: true },
    ]);
    expect(machine.handleKeyDown(58)).toEqual([]);
    expect(machine.handleKeyUp(63)).toEqual([
      { type: "ptt-state-changed", isPressed: false },
    ]);
  });

  it("emits toggle-recording once per exact key combo press", async () => {
    const { NativeHelperShortcutStateMachine } =
      await loadModuleForPlatform("web");
    const machine = new NativeHelperShortcutStateMachine({
      pushToTalk: [63],
      toggleRecording: [63, 49],
      pasteLastTranscript: [55, 59, 9],
      newNote: [55, 59, 45],
    });

    expect(machine.handleKeyDown(63)).toEqual([
      { type: "ptt-state-changed", isPressed: true },
    ]);
    expect(machine.handleKeyDown(49)).toEqual([
      { type: "toggle-recording-triggered" },
    ]);
    expect(machine.handleKeyDown(49)).toEqual([]);
    expect(machine.handleKeyUp(49)).toEqual([]);
    expect(machine.handleKeyDown(49)).toEqual([
      { type: "toggle-recording-triggered" },
    ]);
  });

  it("clears stale keys using recheck results", async () => {
    const { NativeHelperShortcutStateMachine } =
      await loadModuleForPlatform("web");
    const machine = new NativeHelperShortcutStateMachine({
      pushToTalk: [63],
      toggleRecording: [63, 49],
      pasteLastTranscript: [55, 59, 9],
      newNote: [55, 59, 45],
    });

    expect(machine.handleKeyDown(63, 100)).toEqual([
      { type: "ptt-state-changed", isPressed: true },
    ]);
    expect(machine.getActiveKeys()).toEqual([63]);

    expect(machine.clearStaleKeys([63], 150)).toEqual([
      { type: "ptt-state-changed", isPressed: false },
    ]);
    expect(machine.getActiveKeys()).toEqual([]);
  });

  it("ignores stale keys that were pressed after recheck started", async () => {
    const { NativeHelperShortcutStateMachine } =
      await loadModuleForPlatform("web");
    const machine = new NativeHelperShortcutStateMachine({
      pushToTalk: [63],
      toggleRecording: [63, 49],
      pasteLastTranscript: [55, 59, 9],
      newNote: [55, 59, 45],
    });

    expect(machine.handleKeyDown(63, 300)).toEqual([
      { type: "ptt-state-changed", isPressed: true },
    ]);
    expect(machine.clearStaleKeys([63], 250)).toEqual([]);
    expect(machine.getActiveKeys()).toEqual([63]);
  });

  it("returns platform defaults by OS hint", async () => {
    const { getDefaultNativeHelperShortcutConfig } =
      await loadModuleForPlatform("web");
    const mac = getDefaultNativeHelperShortcutConfig({ isMac: true });
    const windows = getDefaultNativeHelperShortcutConfig({ isMac: false });

    expect(mac.toggleRecording).toEqual([63, 49]);
    expect(windows.toggleRecording).toEqual([0x11, 0x5b, 0x20]);
  });

  it("coerces partially invalid shortcut configs with defaults", async () => {
    const { coerceNativeHelperShortcutConfig } =
      await loadModuleForPlatform("web");

    const normalized = coerceNativeHelperShortcutConfig(
      {
        pushToTalk: [63, 63, 49.5, "bad"],
        toggleRecording: [],
        pasteLastTranscript: [55, 59, 9],
        newNote: null,
      },
      {
        fallback: {
          pushToTalk: [63],
          toggleRecording: [63, 49],
          pasteLastTranscript: [55, 59, 9],
          newNote: [55, 59, 45],
        },
      }
    );

    expect(normalized.pushToTalk).toEqual([63]);
    expect(normalized.toggleRecording).toEqual([63, 49]);
    expect(normalized.pasteLastTranscript).toEqual([55, 59, 9]);
    expect(normalized.newNote).toEqual([55, 59, 45]);
  });

  it("formats shortcut keycodes with platform labels", async () => {
    const { formatNativeHelperShortcut } = await loadModuleForPlatform("web");

    expect(formatNativeHelperShortcut([63, 49], { isMac: true })).toBe(
      "Fn + Space"
    );
    expect(formatNativeHelperShortcut([17, 91, 32], { isMac: false })).toBe(
      "Ctrl + Meta + Space"
    );
    expect(formatNativeHelperShortcut([999], { isMac: false })).toBe("Key 999");
  });
});
