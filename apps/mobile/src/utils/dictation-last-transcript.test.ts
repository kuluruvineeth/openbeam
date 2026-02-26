import { afterEach, describe, expect, it } from "vitest";

import {
  clearLastDictationTranscript,
  getLastDictationTranscript,
  resetLastDictationTranscriptForTests,
  setLastDictationTranscript,
} from "./dictation-last-transcript";

afterEach(() => {
  resetLastDictationTranscriptForTests();
});

describe("dictation-last-transcript", () => {
  it("stores trimmed transcript text", () => {
    setLastDictationTranscript("  hello world  ");

    expect(getLastDictationTranscript()).toBe("hello world");
  });

  it("ignores blank transcript updates", () => {
    setLastDictationTranscript("first");
    setLastDictationTranscript("   ");

    expect(getLastDictationTranscript()).toBe("first");
  });

  it("clears transcript text explicitly", () => {
    setLastDictationTranscript("first");
    clearLastDictationTranscript();

    expect(getLastDictationTranscript()).toBe("");
  });
});
