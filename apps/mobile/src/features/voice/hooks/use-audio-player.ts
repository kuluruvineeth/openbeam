import type { AudioPlayer } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useRef, useState } from "react";
import type { AudioPlayerResult } from "../types";

type QueuedAudio = {
  base64: string;
};

export function useAudioPlayerHook(): AudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const queueRef = useRef<QueuedAudio[]>([]);
  const playerRef = useRef<AudioPlayer | null>(null);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) {
      return;
    }
    if (queueRef.current.length === 0) {
      setIsPlaying(false);
      return;
    }

    isProcessingRef.current = true;
    setIsPlaying(true);

    while (queueRef.current.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
      const item = queueRef.current.shift()!;
      try {
        const tempFile = `${FileSystem.cacheDirectory}voice-playback-${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(tempFile, item.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const player = createAudioPlayer(tempFile);
        playerRef.current = player;

        await new Promise<void>((resolve) => {
          player.addListener("playbackStatusUpdate", (status) => {
            if (status.didJustFinish) {
              resolve();
            }
          });
          player.play();
        });

        playerRef.current = null;

        await FileSystem.deleteAsync(tempFile, { idempotent: true });
      } catch {
        // Continue with next item in queue
      }
    }

    isProcessingRef.current = false;
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (audioData: string) => {
      queueRef.current.push({ base64: audioData });
      await processQueue();
    },
    [processQueue]
  );

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  const stop = useCallback(async () => {
    queueRef.current = [];
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current = null;
    }
    isProcessingRef.current = false;
    setIsPlaying(false);
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
  }, []);

  return { play, stop, clearQueue, isPlaying };
}
