import { describe, expect, it, vi } from "vitest";

import {
  applyDictationContextAwareFormatting,
  detectDictationAppProfile,
  prepareDictationTranscriptForNativePaste,
  shouldAutoPasteDictationToFocusedApp,
} from "./dictation-paste-context";

function buildContext(overrides?: Record<string, unknown>) {
  return {
    context: {
      application: {
        bundleIdentifier: "com.slack.Slack",
      },
      windowInfo: {
        url: "https://app.slack.com/client/T123/C123",
      },
      textSelection: {
        preSelectionText: "Hello ",
        postSelectionText: "world",
      },
      ...(overrides ?? {}),
    },
  };
}

describe("dictation-paste-context", () => {
  it("detects app profile from native bundle identifier", () => {
    expect(detectDictationAppProfile(buildContext())).toBe("chat");
  });

  it("detects app profile from browser url when bundle is a browser", () => {
    const context = buildContext({
      application: { bundleIdentifier: "com.google.Chrome" },
      windowInfo: { url: "https://www.notion.so/workspace/page" },
    });
    expect(detectDictationAppProfile(context)).toBe("notes");
  });

  it("returns default app profile when context is missing", () => {
    expect(detectDictationAppProfile({ context: null })).toBe("default");
  });

  it("arms external auto-paste for third-party focused apps", () => {
    expect(shouldAutoPasteDictationToFocusedApp(buildContext())).toBe(true);
  });

  it("does not arm external auto-paste when OpenBeam desktop is focused", () => {
    const openbeamContext = buildContext({
      application: { bundleIdentifier: "dev.openbeam.desktop" },
      windowInfo: { url: "tauri://localhost" },
    });
    expect(shouldAutoPasteDictationToFocusedApp(openbeamContext)).toBe(false);
  });

  it("does not arm external auto-paste for OpenBeam web urls", () => {
    const openbeamWebContext = buildContext({
      application: { bundleIdentifier: "com.google.Chrome" },
      windowInfo: { url: "https://app.openbeam.dev/srv_123/agent_123" },
    });
    expect(shouldAutoPasteDictationToFocusedApp(openbeamWebContext)).toBe(
      false
    );
  });

  it("strips leading whitespace when prior text already ends in whitespace", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: " hello",
      contextResult: buildContext({
        textSelection: {
          preSelectionText: "Hello ",
          postSelectionText: "world",
        },
      }),
    });

    expect(formatted.text).toBe("hello ");
    expect(formatted.usedAccessibilityContext).toBe(true);
  });

  it("adds leading whitespace when prior text does not end in whitespace", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "hello",
      contextResult: buildContext({
        textSelection: {
          preSelectionText: "Hello",
          postSelectionText: "world",
        },
      }),
    });

    expect(formatted.text).toBe(" hello ");
  });

  it("does not add a leading space before closing punctuation", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: ", world",
      contextResult: buildContext({
        textSelection: {
          preSelectionText: "Hello",
          postSelectionText: "",
        },
      }),
    });

    expect(formatted.text).toBe(", world");
  });

  it("removes duplicate boundary whitespace with following text", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "hello ",
      contextResult: buildContext({
        textSelection: {
          preSelectionText: "Hi",
          postSelectionText: " there",
        },
      }),
    });

    expect(formatted.text).toBe(" hello");
  });

  it("collapses excessive newlines for chat profile", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "line1\n\n\n\nline2",
      contextResult: buildContext({
        textSelection: {
          preSelectionText: "",
          postSelectionText: "",
        },
      }),
    });

    expect(formatted.text).toBe("line1\n\nline2");
    expect(formatted.appProfile).toBe("chat");
  });

  it("converts spoken structure commands into newlines", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "first new line second new paragraph third",
      contextResult: buildContext({
        textSelection: {
          preSelectionText: "",
          postSelectionText: "",
        },
      }),
    });

    expect(formatted.text).toBe("first\nsecond\n\nthird");
  });

  it("normalizes spoken notes bullets in notes profile", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "bullet first item new line dash second item",
      contextResult: buildContext({
        application: { bundleIdentifier: "notion.id" },
        textSelection: {
          preSelectionText: "",
          postSelectionText: "",
        },
      }),
    });

    expect(formatted.appProfile).toBe("notes");
    expect(formatted.text).toBe("- first item\n- second item");
  });

  it("adds paragraph breaks around email greeting and closing", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "Hi team\nPlease review the proposal\nThanks",
      contextResult: buildContext({
        application: { bundleIdentifier: "com.microsoft.Outlook" },
        textSelection: {
          preSelectionText: "",
          postSelectionText: "",
        },
      }),
    });

    expect(formatted.appProfile).toBe("email");
    expect(formatted.text).toBe(
      "Hi team\n\nPlease review the proposal\n\nThanks"
    );
  });

  it("preserves multi-paragraph spacing in code profile", () => {
    const formatted = applyDictationContextAwareFormatting({
      transcript: "line1\n\n\n\nline2",
      contextResult: buildContext({
        application: { bundleIdentifier: "com.microsoft.VSCode" },
        textSelection: {
          preSelectionText: "",
          postSelectionText: "",
        },
      }),
    });

    expect(formatted.appProfile).toBe("code");
    expect(formatted.text).toBe("line1\n\n\n\nline2");
  });

  it("prepares transcript with bounded timeout and editable-only context fetch", async () => {
    const getNativeHelperAccessibilityContext = vi.fn(async () =>
      buildContext()
    );
    const client = {
      getNativeHelperAccessibilityContext,
    };

    const prepared = await prepareDictationTranscriptForNativePaste({
      transcript: "hello",
      client,
      timeoutMs: 600,
    });

    expect(prepared.text).toBe("hello ");
    expect(getNativeHelperAccessibilityContext).toHaveBeenCalledWith({
      editableOnly: true,
      timeoutMs: 600,
    });
  });

  it("falls back to raw transcript when context fetch fails", async () => {
    const onWarn = vi.fn();
    const client = {
      // biome-ignore lint/suspicious/useAwait: async signature required by interface
      getNativeHelperAccessibilityContext: vi.fn(async () => {
        throw new Error("helper unavailable");
      }),
    };

    const prepared = await prepareDictationTranscriptForNativePaste({
      transcript: "hello",
      client,
      onWarn,
    });

    expect(prepared).toEqual({
      text: "hello",
      appProfile: "default",
      usedAccessibilityContext: false,
    });
    expect(onWarn).toHaveBeenCalledTimes(1);
  });

  it("uses default timeout when input timeout is invalid", async () => {
    const getNativeHelperAccessibilityContext = vi.fn(async () =>
      buildContext()
    );
    const client = {
      getNativeHelperAccessibilityContext,
    };

    await prepareDictationTranscriptForNativePaste({
      transcript: "hello",
      client,
      timeoutMs: -1,
    });

    expect(getNativeHelperAccessibilityContext).toHaveBeenCalledWith({
      editableOnly: true,
      timeoutMs: 250,
    });
  });
});
