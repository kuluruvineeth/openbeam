import { describe, expect, it, vi } from "vitest";

import {
  createDictationSystemAudioState,
  type DictationSystemAudioClient,
  muteSystemAudioForDictation,
  restoreSystemAudioForDictation,
} from "./dictation-system-audio";

function createClient(
  overrides?: Partial<DictationSystemAudioClient>
): DictationSystemAudioClient {
  return {
    isConnected: true,
    muteSystemAudioWithNativeHelper: vi.fn(async () => ({ success: true })),
    restoreSystemAudioWithNativeHelper: vi.fn(async () => ({ success: true })),
    ...overrides,
  };
}

describe("dictation-system-audio", () => {
  it("mutes system audio when enabled and connected", async () => {
    const state = createDictationSystemAudioState();
    const client = createClient();

    const result = await muteSystemAudioForDictation({
      enabled: true,
      state,
      client,
      timeoutMs: 2500,
    });

    expect(result).toBe(true);
    expect(state.mutedByApp).toBe(true);
    expect(client.muteSystemAudioWithNativeHelper).toHaveBeenCalledWith({
      timeoutMs: 2500,
    });
  });

  it("skips mute when disabled", async () => {
    const state = createDictationSystemAudioState();
    const client = createClient();

    const result = await muteSystemAudioForDictation({
      enabled: false,
      state,
      client,
    });

    expect(result).toBe(false);
    expect(state.mutedByApp).toBe(false);
    expect(client.muteSystemAudioWithNativeHelper).not.toHaveBeenCalled();
  });

  it("does not send duplicate mute calls when already muted by app", async () => {
    const state = createDictationSystemAudioState();
    state.mutedByApp = true;
    const client = createClient();

    const result = await muteSystemAudioForDictation({
      enabled: true,
      state,
      client,
    });

    expect(result).toBe(true);
    expect(client.muteSystemAudioWithNativeHelper).not.toHaveBeenCalled();
  });

  it("restores system audio and clears muted state on success", async () => {
    const state = createDictationSystemAudioState();
    state.mutedByApp = true;
    const client = createClient();

    const result = await restoreSystemAudioForDictation({
      state,
      client,
      timeoutMs: 1500,
    });

    expect(result).toBe(true);
    expect(state.mutedByApp).toBe(false);
    expect(client.restoreSystemAudioWithNativeHelper).toHaveBeenCalledWith({
      timeoutMs: 1500,
    });
  });

  it("keeps muted state when restore fails so caller can retry", async () => {
    const state = createDictationSystemAudioState();
    state.mutedByApp = true;
    const onWarn = vi.fn();
    const client = createClient({
      restoreSystemAudioWithNativeHelper: vi.fn(async () => ({
        success: false,
      })),
    });

    const result = await restoreSystemAudioForDictation({
      state,
      client,
      onWarn,
    });

    expect(result).toBe(false);
    expect(state.mutedByApp).toBe(true);
    expect(onWarn).toHaveBeenCalledWith(
      "Native helper restoreSystemAudio call did not succeed"
    );
  });

  it("warns and skips restore when disconnected", async () => {
    const state = createDictationSystemAudioState();
    state.mutedByApp = true;
    const onWarn = vi.fn();
    const client = createClient({ isConnected: false });

    const result = await restoreSystemAudioForDictation({
      state,
      client,
      onWarn,
    });

    expect(result).toBe(false);
    expect(state.mutedByApp).toBe(true);
    expect(client.restoreSystemAudioWithNativeHelper).not.toHaveBeenCalled();
    expect(onWarn).toHaveBeenCalledWith(
      "Native helper restore skipped because daemon client is disconnected"
    );
  });

  it("restores successfully after reconnect when a prior restore was skipped", async () => {
    const state = createDictationSystemAudioState();
    state.mutedByApp = true;
    const onWarn = vi.fn();
    const restoreMock = vi.fn(async () => ({ success: true }));
    const disconnectedClient = createClient({
      isConnected: false,
      restoreSystemAudioWithNativeHelper: restoreMock,
    });

    const skipped = await restoreSystemAudioForDictation({
      state,
      client: disconnectedClient,
      onWarn,
    });
    expect(skipped).toBe(false);
    expect(state.mutedByApp).toBe(true);

    const reconnectedClient = createClient({
      isConnected: true,
      restoreSystemAudioWithNativeHelper: restoreMock,
    });
    const restored = await restoreSystemAudioForDictation({
      state,
      client: reconnectedClient,
      onWarn,
    });
    expect(restored).toBe(true);
    expect(state.mutedByApp).toBe(false);
    expect(restoreMock).toHaveBeenCalledTimes(1);
  });
});
