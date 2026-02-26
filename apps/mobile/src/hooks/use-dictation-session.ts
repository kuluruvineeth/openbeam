import { useCallback, useEffect, useRef } from "react";
import { useDictation } from "@/features/voice/hooks/use-dictation";
import type { VoiceStreamClient } from "@/features/voice/types";
import type { DictationMode } from "@/stores/dictation-store";
import { useDictationStore } from "@/stores/dictation-store";
import { useTranscriptionStore } from "@/stores/transcription-store";
import { useElapsedTick } from "./use-elapsed-tick";

type UseDictationSessionOptions = {
  client: VoiceStreamClient | null;
  onTextInjected?: (text: string) => void;
};

export function useDictationSession({
  client,
  onTextInjected,
}: UseDictationSessionOptions) {
  const dictationState = useDictationStore((s) => s.state);
  const dictationMode = useDictationStore((s) => s.mode);
  const transcript = useDictationStore((s) => s.transcript);
  const interimTranscript = useDictationStore((s) => s.interimTranscript);
  const voiceDetected = useDictationStore((s) => s.voiceDetected);
  const elapsedMs = useDictationStore((s) => s.elapsedMs);
  const error = useDictationStore((s) => s.error);

  const storeStart = useDictationStore((s) => s.start);
  const storeStop = useDictationStore((s) => s.stop);
  const storeCancel = useDictationStore((s) => s.cancel);
  const storeAppendTranscript = useDictationStore((s) => s.appendTranscript);
  const storeSetInterimTranscript = useDictationStore(
    (s) => s.setInterimTranscript
  );
  const storeSetError = useDictationStore((s) => s.setError);
  const storeReset = useDictationStore((s) => s.reset);
  const storeTick = useDictationStore((s) => s.tick);

  const addTranscription = useTranscriptionStore((s) => s.addTranscription);

  const onTextInjectedRef = useRef(onTextInjected);
  onTextInjectedRef.current = onTextInjected;

  const dictation = useDictation({
    client,
    enableDuration: true,
    onTranscript: (text) => {
      storeAppendTranscript(text);
    },
    onPartialTranscript: (text) => {
      storeSetInterimTranscript(text);
    },
    onError: (err) => {
      storeSetError(err.message);
    },
  });

  const isActive =
    dictationState === "recording" || dictationState === "starting";
  useElapsedTick(isActive, storeTick);

  const start = useCallback(
    async (mode: DictationMode) => {
      if (mode === "idle") {
        return;
      }
      storeStart(mode);
      await dictation.startDictation();
    },
    [storeStart, dictation]
  );

  const stop = useCallback(async () => {
    storeStop();
    await dictation.confirmDictation();

    const finalText = useDictationStore.getState().transcript.trim();
    if (finalText) {
      addTranscription({
        text: finalText,
        durationMs: useDictationStore.getState().elapsedMs,
        language: "en",
      });
      onTextInjectedRef.current?.(finalText);
    }

    storeReset();
  }, [storeStop, storeReset, dictation, addTranscription]);

  const cancel = useCallback(async () => {
    storeCancel();
    await dictation.cancelDictation();
  }, [storeCancel, dictation]);

  useEffect(
    () => () => {
      storeReset();
    },
    [storeReset]
  );

  return {
    start,
    stop,
    cancel,
    state: dictationState,
    mode: dictationMode,
    voiceDetected,
    elapsedMs,
    transcript,
    interimTranscript,
    error,
  };
}
