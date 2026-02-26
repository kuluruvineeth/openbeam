import { afterEach, describe, expect, it, vi } from "vitest";

type MockPlatform = "web" | "ios" | "android";

type GlobalSnapshot = {
  Notification: unknown;
  __TAURI__: unknown;
  navigatorDescriptor?: PropertyDescriptor;
};

const originalGlobals: GlobalSnapshot = {
  Notification: (globalThis as { Notification?: unknown }).Notification,
  __TAURI__: (globalThis as { __TAURI__?: unknown }).__TAURI__,
  navigatorDescriptor: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
};

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreGlobals(): void {
  (globalThis as { Notification?: unknown }).Notification =
    originalGlobals.Notification;
  (globalThis as { __TAURI__?: unknown }).__TAURI__ = originalGlobals.__TAURI__;

  if (originalGlobals.navigatorDescriptor) {
    Object.defineProperty(
      globalThis,
      "navigator",
      originalGlobals.navigatorDescriptor
    );
  } else {
    (globalThis as { navigator?: unknown }).navigator = undefined;
  }
}

// biome-ignore lint/suspicious/useAwait: async signature required by interface
async function loadModuleForPlatform(platform: MockPlatform) {
  vi.resetModules();
  vi.doMock("react-native", () => ({ Platform: { OS: platform } }));
  vi.doMock("@/utils/tauri", () => ({
    getTauri: () => {
      const tauri = (globalThis as { __TAURI__?: unknown }).__TAURI__;
      if (!tauri || typeof tauri !== "object") {
        return null;
      }
      return tauri;
    },
  }));
  return import("./desktop-permissions");
}

describe("desktop-permissions", () => {
  afterEach(() => {
    vi.doUnmock("react-native");
    vi.doUnmock("@/utils/tauri");
    vi.restoreAllMocks();
    vi.resetModules();
    restoreGlobals();
  });

  it("shows section only in Tauri web runtime", async () => {
    const { shouldShowDesktopPermissionSection } =
      await loadModuleForPlatform("web");

    expect(shouldShowDesktopPermissionSection()).toBe(false);

    (globalThis as { __TAURI__?: unknown }).__TAURI__ = { notification: {} };
    expect(shouldShowDesktopPermissionSection()).toBe(true);
  });

  it("reads notification and microphone status", async () => {
    const isPermissionGranted = vi.fn(async () => false);
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {
      notification: { isPermissionGranted },
    };
    setNavigator({
      permissions: {
        query: vi.fn(async () => ({ state: "granted" })),
      },
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    });

    const { getDesktopPermissionSnapshot } = await loadModuleForPlatform("web");
    const snapshot = await getDesktopPermissionSnapshot();

    expect(snapshot.notifications.state).toBe("not-granted");
    expect(snapshot.microphone.state).toBe("granted");
    expect(snapshot.accessibility.state).toBe("unavailable");
    expect(isPermissionGranted).toHaveBeenCalledTimes(1);
    expect(snapshot.checkedAt).toBeTypeOf("number");
  });

  it("reads accessibility status from native helper client when connected", async () => {
    const getNativeHelperAccessibilityStatus = vi.fn(async () => ({
      granted: false,
      promptable: true,
      detail: "Accessibility permission has not been granted yet.",
    }));
    const requestNativeHelperAccessibilityPermission = vi.fn(async () => ({
      granted: false,
    }));

    const { getDesktopPermissionSnapshot } = await loadModuleForPlatform("web");
    const snapshot = await getDesktopPermissionSnapshot({
      nativeHelper: {
        client: {
          getNativeHelperAccessibilityStatus,
          requestNativeHelperAccessibilityPermission,
        },
        isConnected: true,
      },
    });

    expect(snapshot.accessibility.state).toBe("prompt");
    expect(snapshot.accessibility.detail).toContain("not been granted");
    expect(getNativeHelperAccessibilityStatus).toHaveBeenCalledTimes(1);
    expect(requestNativeHelperAccessibilityPermission).toHaveBeenCalledTimes(0);
  });

  it("queries microphone permission with correct Permissions instance binding", async () => {
    const permissions = {
      query(this: unknown, _descriptor: { name: string }) {
        if (this !== permissions) {
          throw new TypeError(
            "Can only call Permissions.query on instances of Permissions"
          );
        }
        return Promise.resolve({ state: "granted" as const });
      },
    };

    setNavigator({
      permissions,
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    });

    const { getDesktopPermissionSnapshot } = await loadModuleForPlatform("web");
    const snapshot = await getDesktopPermissionSnapshot();

    expect(snapshot.microphone.state).toBe("granted");
  });

  it("returns a fallback message when runtime blocks Permissions.query", async () => {
    setNavigator({
      permissions: {
        // biome-ignore lint/suspicious/useAwait: async signature required by interface
        query: vi.fn(async () => {
          throw new TypeError(
            "Can only call Permissions.query on instances of Permissions"
          );
        }),
      },
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    });

    const { getDesktopPermissionSnapshot } = await loadModuleForPlatform("web");
    const snapshot = await getDesktopPermissionSnapshot();

    expect(snapshot.microphone.state).toBe("unknown");
    expect(snapshot.microphone.detail).toContain(
      "Microphone status API is unavailable in this runtime."
    );
  });

  it("requests notification permission via Tauri", async () => {
    const requestPermission = vi.fn(async () => "granted");
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {
      notification: { requestPermission },
    };

    const { requestDesktopPermission } = await loadModuleForPlatform("web");
    const result = await requestDesktopPermission({ kind: "notifications" });

    expect(result.state).toBe("granted");
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("falls back to browser Notification permission when Tauri API is unavailable", async () => {
    // biome-ignore lint/complexity/noStaticOnlyClass: necessary for this context
    class MockNotification {
      static permission = "denied";
    }
    (globalThis as { Notification?: unknown }).Notification = MockNotification;
    setNavigator({});

    const { getDesktopPermissionSnapshot } = await loadModuleForPlatform("web");
    const snapshot = await getDesktopPermissionSnapshot();

    expect(snapshot.notifications.state).toBe("denied");
  });

  it("requests microphone permission and stops acquired tracks", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn(async () => ({
      getTracks: () => [{ stop }],
    }));
    setNavigator({
      permissions: {
        query: vi.fn(async () => ({ state: "granted" })),
      },
      mediaDevices: {
        getUserMedia,
      },
    });

    const { requestDesktopPermission } = await loadModuleForPlatform("web");
    const result = await requestDesktopPermission({ kind: "microphone" });

    expect(result.state).toBe("granted");
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("maps microphone request denial to denied status", async () => {
    setNavigator({
      mediaDevices: {
        // biome-ignore lint/suspicious/useAwait: async signature required by interface
        getUserMedia: vi.fn(async () => {
          // biome-ignore lint/style/useThrowOnlyError: necessary for this context
          throw { name: "NotAllowedError", message: "denied" };
        }),
      },
    });

    const { requestDesktopPermission } = await loadModuleForPlatform("web");
    const result = await requestDesktopPermission({ kind: "microphone" });

    expect(result.state).toBe("denied");
  });

  it("requests accessibility permission via native helper client", async () => {
    const getNativeHelperAccessibilityStatus = vi.fn(async () => ({
      granted: false,
      promptable: true,
      detail: "",
    }));
    const requestNativeHelperAccessibilityPermission = vi.fn(async () => ({
      granted: false,
      openedSystemSettings: true,
    }));

    const { requestDesktopPermission } = await loadModuleForPlatform("web");
    const result = await requestDesktopPermission({
      kind: "accessibility",
      nativeHelper: {
        client: {
          getNativeHelperAccessibilityStatus,
          requestNativeHelperAccessibilityPermission,
        },
        isConnected: true,
      },
    });

    expect(result.state).toBe("prompt");
    expect(result.detail).toContain("Opened system settings");
    expect(requestNativeHelperAccessibilityPermission).toHaveBeenCalledTimes(1);
    expect(getNativeHelperAccessibilityStatus).toHaveBeenCalledTimes(1);
  });
});
