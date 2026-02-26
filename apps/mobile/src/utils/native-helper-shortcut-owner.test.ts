import { afterEach, describe, expect, it } from "vitest";

import {
  claimNativeHelperShortcutOwnership,
  getNativeHelperShortcutOwnerForTests,
  isNativeHelperShortcutOwner,
  releaseNativeHelperShortcutOwnership,
  resetNativeHelperShortcutOwnershipForTests,
} from "./native-helper-shortcut-owner";

afterEach(() => {
  resetNativeHelperShortcutOwnershipForTests();
});

describe("native-helper-shortcut-owner", () => {
  it("claims ownership when no owner exists", () => {
    const claimed = claimNativeHelperShortcutOwnership({
      key: "owner-a",
      focused: false,
    });

    expect(claimed).toBe(true);
    expect(getNativeHelperShortcutOwnerForTests()).toEqual({
      key: "owner-a",
      focused: false,
    });
  });

  it("allows current owner to refresh focus status", () => {
    claimNativeHelperShortcutOwnership({ key: "owner-a", focused: false });

    const claimed = claimNativeHelperShortcutOwnership({
      key: "owner-a",
      focused: true,
    });

    expect(claimed).toBe(true);
    expect(getNativeHelperShortcutOwnerForTests()).toEqual({
      key: "owner-a",
      focused: true,
    });
  });

  it("prevents unfocused owner from stealing focused owner", () => {
    claimNativeHelperShortcutOwnership({ key: "owner-a", focused: true });

    const claimed = claimNativeHelperShortcutOwnership({
      key: "owner-b",
      focused: false,
    });

    expect(claimed).toBe(false);
    expect(getNativeHelperShortcutOwnerForTests()).toEqual({
      key: "owner-a",
      focused: true,
    });
  });

  it("allows focused owner to preempt unfocused owner", () => {
    claimNativeHelperShortcutOwnership({ key: "owner-a", focused: false });

    const claimed = claimNativeHelperShortcutOwnership({
      key: "owner-b",
      focused: true,
    });

    expect(claimed).toBe(true);
    expect(getNativeHelperShortcutOwnerForTests()).toEqual({
      key: "owner-b",
      focused: true,
    });
  });

  it("releases owner only for matching key", () => {
    claimNativeHelperShortcutOwnership({ key: "owner-a", focused: true });
    releaseNativeHelperShortcutOwnership("owner-b");

    expect(getNativeHelperShortcutOwnerForTests()).toEqual({
      key: "owner-a",
      focused: true,
    });

    releaseNativeHelperShortcutOwnership("owner-a");
    expect(getNativeHelperShortcutOwnerForTests()).toBeNull();
  });

  it("rejects empty owner keys", () => {
    const claimed = claimNativeHelperShortcutOwnership({
      key: " ",
      focused: true,
    });

    expect(claimed).toBe(false);
    expect(getNativeHelperShortcutOwnerForTests()).toBeNull();
  });

  it("reports whether a key currently owns shortcut handling", () => {
    claimNativeHelperShortcutOwnership({ key: "owner-a", focused: true });

    expect(isNativeHelperShortcutOwner("owner-a")).toBe(true);
    expect(isNativeHelperShortcutOwner("owner-b")).toBe(false);
  });
});
