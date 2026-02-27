import { describe, expect, it, vi } from "vitest";

import { primeDictationNativeHelperAccessibilityContext } from "./dictation-native-helper-context-prime";

describe("dictation-native-helper-context-prime", () => {
  it("does not call native helper when disabled", async () => {
    const getNativeHelperAccessibilityContext = vi.fn(async () => ({
      context: null,
    }));
    const client = {
      isConnected: true,
      getNativeHelperAccessibilityContext,
    };

    const primed = await primeDictationNativeHelperAccessibilityContext({
      enabled: false,
      client,
    });

    expect(primed).toBe(false);
    expect(getNativeHelperAccessibilityContext).not.toHaveBeenCalled();
  });

  it("does not call native helper when disconnected", async () => {
    const getNativeHelperAccessibilityContext = vi.fn(async () => ({
      context: null,
    }));
    const client = {
      isConnected: false,
      getNativeHelperAccessibilityContext,
    };

    const primed = await primeDictationNativeHelperAccessibilityContext({
      enabled: true,
      client,
    });

    expect(primed).toBe(false);
    expect(getNativeHelperAccessibilityContext).not.toHaveBeenCalled();
  });

  it("primes native helper accessibility context with non-editable scope", async () => {
    const getNativeHelperAccessibilityContext = vi.fn(async () => ({
      context: { ok: true },
    }));
    const client = {
      isConnected: true,
      getNativeHelperAccessibilityContext,
    };

    const primed = await primeDictationNativeHelperAccessibilityContext({
      enabled: true,
      client,
      timeoutMs: 400,
    });

    expect(primed).toBe(true);
    expect(getNativeHelperAccessibilityContext).toHaveBeenCalledWith({
      editableOnly: false,
      timeoutMs: 400,
    });
  });

  it("falls back to default timeout when timeout is invalid", async () => {
    const getNativeHelperAccessibilityContext = vi.fn(async () => ({
      context: { ok: true },
    }));
    const client = {
      isConnected: true,
      getNativeHelperAccessibilityContext,
    };

    await primeDictationNativeHelperAccessibilityContext({
      enabled: true,
      client,
      timeoutMs: -1,
    });

    expect(getNativeHelperAccessibilityContext).toHaveBeenCalledWith({
      editableOnly: false,
      timeoutMs: 250,
    });
  });

  it("reports warning when context priming fails", async () => {
    const onWarn = vi.fn();
    const client = {
      isConnected: true,
      // biome-ignore lint/suspicious/useAwait: async signature required by interface
      getNativeHelperAccessibilityContext: vi.fn(async () => {
        throw new Error("unavailable");
      }),
    };

    const primed = await primeDictationNativeHelperAccessibilityContext({
      enabled: true,
      client,
      onWarn,
    });

    expect(primed).toBe(false);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onWarn.mock.calls[0]?.[0]).toBe(
      "Failed to prime native helper accessibility context"
    );
  });
});
