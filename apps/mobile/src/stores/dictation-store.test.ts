import { beforeEach, describe, expect, it } from "vitest";
import { useDictationStore } from "./dictation-store";

function getState() {
  return useDictationStore.getState();
}

describe("dictation-store", () => {
  beforeEach(() => {
    getState().reset();
  });

  it("starts idle", () => {
    expect(getState().state).toBe("idle");
    expect(getState().mode).toBe("idle");
    expect(getState().transcript).toBe("");
  });

  it("starts a ptt session", () => {
    getState().start("ptt");
    expect(getState().state).toBe("starting");
    expect(getState().mode).toBe("ptt");
    expect(getState().elapsedMs).toBe(0);
    expect(getState().isMuted).toBe(false);
    expect(getState().error).toBeNull();
  });

  it("starts a hands-free session", () => {
    getState().start("hands-free");
    expect(getState().state).toBe("starting");
    expect(getState().mode).toBe("hands-free");
  });

  it("ignores start when not idle", () => {
    getState().start("ptt");
    getState().start("hands-free");
    expect(getState().mode).toBe("ptt");
  });

  it("transitions starting → recording on first transcript", () => {
    getState().start("ptt");
    getState().appendTranscript("hello");
    expect(getState().state).toBe("recording");
    expect(getState().transcript).toBe("hello");
    expect(getState().interimTranscript).toBe("");
  });

  it("transitions starting → recording on first interim", () => {
    getState().start("ptt");
    getState().setInterimTranscript("hel");
    expect(getState().state).toBe("recording");
    expect(getState().interimTranscript).toBe("hel");
  });

  it("appends transcript with space separator", () => {
    getState().start("ptt");
    getState().appendTranscript("hello");
    getState().appendTranscript("world");
    expect(getState().transcript).toBe("hello world");
  });

  it("skips separator if transcript already ends with space", () => {
    getState().start("ptt");
    getState().appendTranscript("hello ");
    getState().appendTranscript("world");
    expect(getState().transcript).toBe("hello world");
  });

  it("stops from recording state", () => {
    getState().start("ptt");
    getState().appendTranscript("test");
    getState().stop();
    expect(getState().state).toBe("stopping");
  });

  it("stops from starting state", () => {
    getState().start("ptt");
    getState().stop();
    expect(getState().state).toBe("stopping");
  });

  it("ignores stop when idle", () => {
    getState().stop();
    expect(getState().state).toBe("idle");
  });

  it("cancel resets to initial state", () => {
    getState().start("ptt");
    getState().appendTranscript("partial");
    getState().cancel();
    expect(getState().state).toBe("idle");
    expect(getState().transcript).toBe("");
    expect(getState().mode).toBe("idle");
  });

  it("tracks voice detection with identity guard", () => {
    getState().setVoiceDetected(true);
    expect(getState().voiceDetected).toBe(true);
    getState().setVoiceDetected(true);
    expect(getState().voiceDetected).toBe(true);
  });

  it("ticks elapsed time only when active", () => {
    getState().tick(100);
    expect(getState().elapsedMs).toBe(0);

    getState().start("ptt");
    getState().tick(100);
    expect(getState().elapsedMs).toBe(100);

    getState().appendTranscript("text");
    getState().tick(200);
    expect(getState().elapsedMs).toBe(300);
  });

  it("mute toggle with identity guard", () => {
    getState().setMuted(true);
    expect(getState().isMuted).toBe(true);
    getState().setMuted(false);
    expect(getState().isMuted).toBe(false);
  });

  it("setError resets state to idle", () => {
    getState().start("ptt");
    getState().setError("mic permission denied");
    expect(getState().state).toBe("idle");
    expect(getState().mode).toBe("idle");
    expect(getState().error).toBe("mic permission denied");
  });

  it("reset clears everything", () => {
    getState().start("hands-free");
    getState().appendTranscript("some text");
    getState().tick(5000);
    getState().reset();
    expect(getState().state).toBe("idle");
    expect(getState().transcript).toBe("");
    expect(getState().elapsedMs).toBe(0);
  });
});
