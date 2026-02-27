import { afterEach, describe, expect, it } from "vitest";

import {
  clearDictationNativeHelperAutoPaste,
  clearGlobalDictationNativeHelperAutoPaste,
  consumeDictationNativeHelperAutoPaste,
  consumeGlobalDictationNativeHelperAutoPaste,
  createDictationNativeHelperAutoPasteState,
  getGlobalDictationNativeHelperAutoPasteRequestedAtForTests,
  requestDictationNativeHelperAutoPaste,
  requestGlobalDictationNativeHelperAutoPaste,
  resetGlobalDictationNativeHelperAutoPasteForTests,
} from "./dictation-native-helper-autopaste";

afterEach(() => {
  resetGlobalDictationNativeHelperAutoPasteForTests();
});

describe("dictation-native-helper-autopaste", () => {
  it("consumes active autopaste request inside window", () => {
    const state = createDictationNativeHelperAutoPasteState();
    requestDictationNativeHelperAutoPaste(state, 1000);

    const shouldAutoPaste = consumeDictationNativeHelperAutoPaste({
      state,
      nowMs: 2000,
      windowMs: 2000,
    });

    expect(shouldAutoPaste).toBe(true);
    expect(state.requestedAtMs).toBeNull();
  });

  it("does not auto-paste when request is stale", () => {
    const state = createDictationNativeHelperAutoPasteState();
    requestDictationNativeHelperAutoPaste(state, 1000);

    const shouldAutoPaste = consumeDictationNativeHelperAutoPaste({
      state,
      nowMs: 20_000,
      windowMs: 10_000,
    });

    expect(shouldAutoPaste).toBe(false);
    expect(state.requestedAtMs).toBeNull();
  });

  it("does not auto-paste when request timestamp is in the future", () => {
    const state = createDictationNativeHelperAutoPasteState();
    requestDictationNativeHelperAutoPaste(state, 2000);

    const shouldAutoPaste = consumeDictationNativeHelperAutoPaste({
      state,
      nowMs: 1900,
      windowMs: 10_000,
    });

    expect(shouldAutoPaste).toBe(false);
  });

  it("does not auto-paste when no request exists", () => {
    const state = createDictationNativeHelperAutoPasteState();

    const shouldAutoPaste = consumeDictationNativeHelperAutoPaste({
      state,
      nowMs: 1000,
      windowMs: 10_000,
    });

    expect(shouldAutoPaste).toBe(false);
  });

  it("clears pending request explicitly", () => {
    const state = createDictationNativeHelperAutoPasteState();
    requestDictationNativeHelperAutoPaste(state, 1000);
    clearDictationNativeHelperAutoPaste(state);

    const shouldAutoPaste = consumeDictationNativeHelperAutoPaste({
      state,
      nowMs: 1100,
      windowMs: 10_000,
    });

    expect(shouldAutoPaste).toBe(false);
  });

  it("treats invalid window as disabled autopaste", () => {
    const state = createDictationNativeHelperAutoPasteState();
    requestDictationNativeHelperAutoPaste(state, 1000);

    const shouldAutoPaste = consumeDictationNativeHelperAutoPaste({
      state,
      nowMs: 1500,
      windowMs: -1,
    });

    expect(shouldAutoPaste).toBe(false);
  });

  it("supports shared global auto-paste requests", () => {
    requestGlobalDictationNativeHelperAutoPaste(1000);

    const shouldAutoPaste = consumeGlobalDictationNativeHelperAutoPaste({
      nowMs: 1500,
      windowMs: 5000,
    });

    expect(shouldAutoPaste).toBe(true);
    expect(
      getGlobalDictationNativeHelperAutoPasteRequestedAtForTests()
    ).toBeNull();
  });

  it("clears shared global auto-paste requests explicitly", () => {
    requestGlobalDictationNativeHelperAutoPaste(1000);
    clearGlobalDictationNativeHelperAutoPaste();

    const shouldAutoPaste = consumeGlobalDictationNativeHelperAutoPaste({
      nowMs: 1500,
      windowMs: 5000,
    });

    expect(shouldAutoPaste).toBe(false);
    expect(
      getGlobalDictationNativeHelperAutoPasteRequestedAtForTests()
    ).toBeNull();
  });

  it("uses an extended default global auto-paste window", () => {
    requestGlobalDictationNativeHelperAutoPaste(1000);

    const shouldAutoPaste = consumeGlobalDictationNativeHelperAutoPaste({
      nowMs: 61_000,
    });

    expect(shouldAutoPaste).toBe(true);
    expect(
      getGlobalDictationNativeHelperAutoPasteRequestedAtForTests()
    ).toBeNull();
  });

  it("expires global auto-paste after the default window", () => {
    requestGlobalDictationNativeHelperAutoPaste(1000);

    const shouldAutoPaste = consumeGlobalDictationNativeHelperAutoPaste({
      nowMs: 95_000,
    });

    expect(shouldAutoPaste).toBe(false);
    expect(
      getGlobalDictationNativeHelperAutoPasteRequestedAtForTests()
    ).toBeNull();
  });
});
