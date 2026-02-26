import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { AttemptGuard } from "@/utils/attempt-guard";
import type { AudioCaptureConfig, AudioRecorderResult } from "../types";

async function uriToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

function getActualRecordingUri(
  recorder: ReturnType<typeof useAudioRecorder>
): string | null {
  const raw = recorder.uri;
  if (!raw) {
    return null;
  }
  if (Platform.OS === "android" && raw.startsWith("file:///")) {
    const fileName = raw.split("/").pop();
    if (fileName) {
      return `${FileSystem.cacheDirectory}${fileName}`;
    }
  }
  return raw;
}

export function useAudioRecorderHook(
  config: AudioCaptureConfig = {}
): AudioRecorderResult {
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { sampleRate = 16_000, numberOfChannels = 1, onAudioLevel } = config;

  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const guardRef = useRef(new AttemptGuard());

  const recorder = useAudioRecorder(
    {
      ...RecordingPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
      sampleRate,
      numberOfChannels,
      extension: ".wav",
    },
    (status) => {
      if (status.isFinished) {
        setVolume(0);
      }
    }
  );

  const start = useCallback(async () => {
    const attemptId = guardRef.current.next();

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    guardRef.current.assertCurrent(attemptId);

    if (!permission.granted) {
      throw new Error(
        "Microphone permission required. Enable in system settings."
      );
    }

    recorder.record();

    setIsRecording(true);
  }, [recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    guardRef.current.cancel();

    await recorder.stop();
    setIsRecording(false);
    setVolume(0);

    const uri = getActualRecordingUri(recorder);
    if (!uri) {
      return null;
    }

    try {
      return await uriToBase64(uri);
    } catch {
      return null;
    }
  }, [recorder]);

  return { start, stop, isRecording, volume };
}
