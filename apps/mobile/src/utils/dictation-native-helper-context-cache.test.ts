import { afterEach, describe, expect, it } from "vitest";

import {
  clearDictationNativeHelperAccessibilityContext,
  getRecentDictationNativeHelperAccessibilityContext,
  rememberDictationNativeHelperAccessibilityContext,
} from "./dictation-native-helper-context-cache";

afterEach(() => {
  clearDictationNativeHelperAccessibilityContext();
});

describe("dictation-native-helper-context-cache", () => {
  it("returns null when no cached context exists", () => {
    const result = getRecentDictationNativeHelperAccessibilityContext({
      nowMs: 1000,
    });

    expect(result).toBeNull();
  });

  it("returns cached context when inside max age window", () => {
    const context = {
      context: {
        application: {
          bundleIdentifier: "com.tinyspeck.slackmacgap",
        },
      },
    };
    rememberDictationNativeHelperAccessibilityContext(context, 1000);

    const result = getRecentDictationNativeHelperAccessibilityContext({
      nowMs: 60_000,
    });

    expect(result).toEqual(context);
  });

  it("returns null when cached context is stale", () => {
    rememberDictationNativeHelperAccessibilityContext({ value: true }, 1000);

    const result = getRecentDictationNativeHelperAccessibilityContext({
      nowMs: 200_000,
      maxAgeMs: 30_000,
    });

    expect(result).toBeNull();
  });
});
