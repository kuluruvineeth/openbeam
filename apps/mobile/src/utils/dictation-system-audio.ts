import type { DaemonClient } from "@server/client/daemon-client";

export type DictationSystemAudioClient = Pick<
  DaemonClient,
  | "isConnected"
  | "muteSystemAudioWithNativeHelper"
  | "restoreSystemAudioWithNativeHelper"
>;

export type DictationSystemAudioState = {
  mutedByApp: boolean;
};

export type DictationSystemAudioWarnFn = (
  message: string,
  error?: unknown
) => void;

export function createDictationSystemAudioState(): DictationSystemAudioState {
  return { mutedByApp: false };
}

type NativeHelperCallOptions = {
  timeoutMs?: number;
};

function buildNativeHelperCallOptions(
  timeoutMs?: number
): NativeHelperCallOptions | undefined {
  if (
    typeof timeoutMs !== "number" ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return;
  }
  return { timeoutMs };
}

export async function muteSystemAudioForDictation(params: {
  enabled: boolean;
  state: DictationSystemAudioState;
  client: DictationSystemAudioClient | null;
  timeoutMs?: number;
  onWarn?: DictationSystemAudioWarnFn;
}): Promise<boolean> {
  const { enabled, state, client, timeoutMs, onWarn } = params;

  if (!enabled) {
    return false;
  }

  if (state.mutedByApp) {
    return true;
  }

  if (!client?.isConnected) {
    return false;
  }

  try {
    const result = await client.muteSystemAudioWithNativeHelper(
      buildNativeHelperCallOptions(timeoutMs)
    );
    if (result.success) {
      state.mutedByApp = true;
      return true;
    }

    onWarn?.("Native helper muteSystemAudio call did not succeed");
    return false;
  } catch (error) {
    onWarn?.("Failed to mute system audio via native helper", error);
    return false;
  }
}

export async function restoreSystemAudioForDictation(params: {
  state: DictationSystemAudioState;
  client: DictationSystemAudioClient | null;
  timeoutMs?: number;
  onWarn?: DictationSystemAudioWarnFn;
}): Promise<boolean> {
  const { state, client, timeoutMs, onWarn } = params;

  if (!state.mutedByApp) {
    return false;
  }

  if (!client?.isConnected) {
    onWarn?.(
      "Native helper restore skipped because daemon client is disconnected"
    );
    return false;
  }

  try {
    const result = await client.restoreSystemAudioWithNativeHelper(
      buildNativeHelperCallOptions(timeoutMs)
    );
    if (result.success) {
      state.mutedByApp = false;
      return true;
    }

    onWarn?.("Native helper restoreSystemAudio call did not succeed");
    return false;
  } catch (error) {
    onWarn?.("Failed to restore system audio via native helper", error);
    return false;
  }
}
