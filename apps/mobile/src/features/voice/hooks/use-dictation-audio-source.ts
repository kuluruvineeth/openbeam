import { AudioModule } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { AttemptGuard } from "@/utils/attempt-guard";
import { SAMPLE_RATE } from "../constants";
import type {
  DictationAudioSource,
  DictationAudioSourceConfig,
} from "../types";

type RecordingStatusLike = {
  metering?: number | null;
};

export function useDictationAudioSource(
  config: DictationAudioSourceConfig
): DictationAudioSource {
  const [volume, setVolume] = useState(0);
  const guardRef = useRef(new AttemptGuard());
  const isActiveRef = useRef(false);
  const recordingRef = useRef<{
    stop: () => Promise<void>;
    uri: string | null;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onPcmSegmentRef = useRef(config.onPcmSegment);
  onPcmSegmentRef.current = config.onPcmSegment;

  const onErrorRef = useRef(config.onError);
  onErrorRef.current = config.onError;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (isActiveRef.current) {
      return;
    }

    const attemptId = guardRef.current.next();

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      guardRef.current.assertCurrent(attemptId);

      if (!permission.granted) {
        throw new Error("Microphone permission required");
      }

      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const { recording } = await AudioModule.Recording.createAsync({
        sampleRate: SAMPLE_RATE,
        numberOfChannels: 1,
        bitRate: 128_000,
        extension: ".wav",
        outputFormat: "wav",
        isMeteringEnabled: true,
        ...(Platform.OS === "android" && {
          audioSource: 7,
        }),
      } as Parameters<typeof AudioModule.Recording.createAsync>[0]);

      guardRef.current.assertCurrent(attemptId);
      isActiveRef.current = true;

      recordingRef.current = {
        stop: async () => {
          await recording.stopAndUnloadAsync();
        },
        uri: recording.getURI(),
      };

      intervalRef.current = setInterval(() => {
        if (!isActiveRef.current) {
          return;
        }
        const status = recording.getStatusAsync();
        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        void status.then((s: RecordingStatusLike) => {
          if (s.metering != null) {
            const normalized = Math.max(0, Math.min(1, (s.metering + 60) / 60));
            setVolume(normalized);
          }
        });
      }, 100);
    } catch (err) {
      isActiveRef.current = false;
      const error = err instanceof Error ? err : new Error(String(err));
      onErrorRef.current?.(error);
      throw error;
    }
  }, []);

  const stop = useCallback(async () => {
    guardRef.current.cancel();
    stopPolling();
    isActiveRef.current = false;
    setVolume(0);

    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) {
      return;
    }

    try {
      await rec.stop();

      const uri = rec.uri;
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        onPcmSegmentRef.current(base64);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onErrorRef.current?.(error);
    }
  }, [stopPolling]);

  return { start, stop, volume };
}
