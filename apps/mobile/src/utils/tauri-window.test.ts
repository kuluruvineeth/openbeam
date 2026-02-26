import { afterEach, describe, expect, it, vi } from "vitest";

type TauriGlobal = {
  __TAURI__?: unknown;
};

const originalTauri = (globalThis as TauriGlobal).__TAURI__;

// biome-ignore lint/suspicious/useAwait: async signature required by interface
async function loadModuleForPlatform(platform: "web" | "ios" | "android") {
  vi.resetModules();
  vi.doMock("react-native", () => ({ Platform: { OS: platform } }));
  vi.doMock("../constants/layout", () => ({
    getIsTauriMac: () => false,
    TAURI_TRAFFIC_LIGHT_WIDTH: 72,
    TAURI_TRAFFIC_LIGHT_HEIGHT: 30,
  }));
  return import("./tauri-window");
}

afterEach(() => {
  (globalThis as TauriGlobal).__TAURI__ = originalTauri;
  vi.doUnmock("react-native");
  vi.doUnmock("../constants/layout");
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("focusMainWindow", () => {
  it("uses current window APIs when available", async () => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const show = vi.fn(async () => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const unminimize = vi.fn(async () => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const setFocus = vi.fn(async () => {});

    (globalThis as TauriGlobal).__TAURI__ = {
      window: {
        getCurrentWindow: () => ({
          show,
          unminimize,
          setFocus,
        }),
      },
    };

    const { focusMainWindow } = await loadModuleForPlatform("web");
    await focusMainWindow();

    expect(show).toHaveBeenCalledTimes(1);
    expect(unminimize).toHaveBeenCalledTimes(1);
    expect(setFocus).toHaveBeenCalledTimes(1);
  });

  it("falls back to window plugin invokes when current window API is unavailable", async () => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const invoke = vi.fn(async () => {});

    (globalThis as TauriGlobal).__TAURI__ = {
      core: {
        invoke,
      },
      event: {},
    };

    const { focusMainWindow } = await loadModuleForPlatform("web");
    await focusMainWindow();

    expect(invoke).toHaveBeenCalledWith("plugin:window|show", {
      label: "main",
    });
    expect(invoke).toHaveBeenCalledWith("plugin:window|unminimize", {
      label: "main",
    });
    expect(invoke).toHaveBeenCalledWith("plugin:window|set_focus", {
      label: "main",
    });
  });

  it("continues focus sequence when an earlier step fails", async () => {
    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    const show = vi.fn(async () => {
      throw new Error("show failed");
    });
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const unminimize = vi.fn(async () => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const setFocus = vi.fn(async () => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    (globalThis as TauriGlobal).__TAURI__ = {
      window: {
        getCurrentWindow: () => ({
          show,
          unminimize,
          setFocus,
        }),
      },
    };

    const { focusMainWindow } = await loadModuleForPlatform("web");
    await focusMainWindow();

    expect(show).toHaveBeenCalledTimes(1);
    expect(unminimize).toHaveBeenCalledTimes(1);
    expect(setFocus).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });
});
