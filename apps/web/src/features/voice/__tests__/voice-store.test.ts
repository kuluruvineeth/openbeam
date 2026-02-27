import { beforeEach, describe, expect, it } from "vitest";
import { useVoiceStore } from "../stores/voice-store";

describe("voice store", () => {
  beforeEach(() => {
    useVoiceStore.getState().reset();
  });

  it("starts in idle mode", () => {
    const state = useVoiceStore.getState();
    expect(state.mode).toBe("idle");
    expect(state.agentState).toBe("disconnected");
    expect(state.isConnected).toBe(false);
  });

  it("transitions mode", () => {
    useVoiceStore.getState().setMode("dictation");
    expect(useVoiceStore.getState().mode).toBe("dictation");
  });

  it("transitions agent state", () => {
    useVoiceStore.getState().setAgentState("listening");
    expect(useVoiceStore.getState().agentState).toBe("listening");
  });

  it("appends transcript", () => {
    useVoiceStore.getState().appendTranscript("Hello ");
    useVoiceStore.getState().appendTranscript("world");
    expect(useVoiceStore.getState().transcript).toBe("Hello world");
  });

  it("sets interim transcript", () => {
    useVoiceStore.getState().setInterimTranscript("typing...");
    expect(useVoiceStore.getState().interimTranscript).toBe("typing...");
  });

  it("resets to initial state", () => {
    useVoiceStore.getState().setMode("action");
    useVoiceStore.getState().setAgentState("speaking");
    useVoiceStore.getState().appendTranscript("test");
    useVoiceStore.getState().reset();

    const state = useVoiceStore.getState();
    expect(state.mode).toBe("idle");
    expect(state.agentState).toBe("disconnected");
    expect(state.transcript).toBe("");
  });

  it("toggles mute", () => {
    useVoiceStore.getState().setMuted(true);
    expect(useVoiceStore.getState().isMuted).toBe(true);

    useVoiceStore.getState().setMuted(false);
    expect(useVoiceStore.getState().isMuted).toBe(false);
  });

  it("sets error", () => {
    useVoiceStore.getState().setError("Connection failed");
    expect(useVoiceStore.getState().error).toBe("Connection failed");

    useVoiceStore.getState().setError(null);
    expect(useVoiceStore.getState().error).toBeNull();
  });

  it("tracks volume level", () => {
    useVoiceStore.getState().setVolumeLevel(0.75);
    expect(useVoiceStore.getState().volumeLevel).toBe(0.75);

    useVoiceStore.getState().reset();
    expect(useVoiceStore.getState().volumeLevel).toBe(0);
  });
});
