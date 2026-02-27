import { useCallback, useEffect, useRef, useState } from "react";
import { AttemptGuard } from "@/utils/attempt-guard";
import { DURATION_TICK_MS, PCM_DICTATION_FORMAT } from "../constants";
import { DictationStreamSender } from "../lib/dictation-stream-sender";
import type {
  DictationStatus,
  UseDictationOptions,
  UseDictationResult,
} from "../types";
import { useDictationAudioSource } from "./use-dictation-audio-source";

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

function toError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  if (typeof err === "string" && err.trim().length > 0) {
    return new Error(err);
  }
  return new Error("An unexpected error occurred during dictation.");
}

export function useDictation(options: UseDictationOptions): UseDictationResult {
  const {
    client,
    onTranscript,
    onPartialTranscript,
    onError,
    onPermanentFailure,
    canStart,
    canConfirm,
    autoStopWhenHidden,
    enableDuration = false,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DictationStatus>("idle");

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const onPartialTranscriptRef = useRef(onPartialTranscript);
  useEffect(() => {
    onPartialTranscriptRef.current = onPartialTranscript;
  }, [onPartialTranscript]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const onPermanentFailureRef = useRef(onPermanentFailure);
  useEffect(() => {
    onPermanentFailureRef.current = onPermanentFailure;
  }, [onPermanentFailure]);

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const isProcessingRef = useRef(isProcessing);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const attemptGuardRef = useRef(new AttemptGuard());
  const actionGateRef = useRef({
    starting: false,
    confirming: false,
    cancelling: false,
  });

  const senderRef = useRef<DictationStreamSender | null>(null);
  if (!senderRef.current) {
    senderRef.current = new DictationStreamSender({
      client,
      format: PCM_DICTATION_FORMAT,
      createDictationId: generateId,
    });
  }
  useEffect(() => {
    senderRef.current?.setClient(client);
  }, [client]);

  const stopDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startDurationTracking = useCallback(() => {
    if (!enableDuration) {
      return;
    }
    if (durationIntervalRef.current) {
      return;
    }
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, DURATION_TICK_MS);
  }, [enableDuration]);

  useEffect(() => {
    if (!enableDuration) {
      stopDurationTracking();
      setDuration(0);
    }
  }, [enableDuration, stopDurationTracking]);

  const reportError = useCallback((err: unknown, _context?: string) => {
    const normalized = toError(err);
    if (normalized.name === "AttemptCancelledError") {
      return;
    }
    setError(normalized.message);
    onErrorRef.current?.(normalized);
  }, []);

  const clearStreamingState = useCallback(() => {
    senderRef.current?.clearAll();
    setPartialTranscript("");
  }, []);

  const startNewStream = useCallback(async (reason: string) => {
    await senderRef.current?.restartStream(reason);
  }, []);

  const ensureFinalTranscript = useCallback(
    async (finalSeq: number): Promise<string> => {
      const result = await senderRef.current?.finish(finalSeq);
      return result.text;
    },
    []
  );

  useEffect(() => {
    if (!client?.subscribeConnectionStatus) {
      return;
    }
    return client.subscribeConnectionStatus((next) => {
      if (next.status !== "connected") {
        return;
      }
      if (!isRecordingRef.current) {
        return;
      }
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void startNewStream("reconnect").catch((err) => {
        reportError(err, "Failed to restart dictation after reconnect");
      });
    });
  }, [client, reportError, startNewStream]);

  useEffect(() => {
    if (!client?.on) {
      return;
    }
    return client.on("dictation_stream_partial", (message) => {
      if (message.type !== "dictation_stream_partial") {
        return;
      }
      const activeDictationId = senderRef.current?.getDictationId();
      if (!activeDictationId) {
        return;
      }
      if (message.payload.dictationId !== activeDictationId) {
        return;
      }
      const next = message.payload.text ?? "";
      setPartialTranscript(next);
      onPartialTranscriptRef.current?.(next, { requestId: generateId() });
    });
  }, [client]);

  const audio = useDictationAudioSource({
    onPcmSegment: (audioData) => {
      senderRef.current?.enqueueSegment(audioData);
    },
    onError: (err) => {
      onErrorRef.current?.(err);
    },
  });
  const audioStopRef = useRef(audio.stop);
  useEffect(() => {
    audioStopRef.current = audio.stop;
  }, [audio.stop]);

  const handleStreamingTranscriptionSuccess = useCallback(
    (text: string, requestId: string) => {
      setIsProcessing(false);
      isProcessingRef.current = false;
      setPartialTranscript("");
      setDuration(0);
      setStatus("idle");
      clearStreamingState();

      const transcriptText = text.trim();
      if (!transcriptText) {
        return;
      }
      onTranscriptRef.current?.(transcriptText, { requestId });
    },
    [clearStreamingState]
  );

  const handleDictationFailure = useCallback(
    (failure: unknown) => {
      const normalized = toError(failure);
      const failureId = generateId();
      setIsProcessing(false);
      isProcessingRef.current = false;
      isRecordingRef.current = false;
      setIsRecording(false);

      if (senderRef.current?.hasSegments()) {
        setStatus("failed");
        onPermanentFailureRef.current?.(normalized, { requestId: failureId });
      } else {
        setStatus("idle");
      }

      reportError(normalized, "Failed to complete dictation");
    },
    [reportError]
  );

  const startDictation = useCallback(async () => {
    const gate = actionGateRef.current;
    if (gate.starting || gate.confirming || gate.cancelling) {
      return;
    }
    if (isRecordingRef.current || isProcessingRef.current) {
      return;
    }
    if (canStart && !canStart()) {
      return;
    }

    gate.starting = true;
    setError(null);
    setPartialTranscript("");
    setDuration(0);
    setIsProcessing(false);
    setStatus("recording");
    clearStreamingState();

    try {
      await audio.start();
      if (client?.isConnected) {
        await startNewStream("start");
      }
      isRecordingRef.current = true;
      setIsRecording(true);
      if (enableDuration) {
        startDurationTracking();
      }
    } catch (err) {
      await audio.stop().catch(() => {
        /* intentional no-op */
      });
      stopDurationTracking();
      isRecordingRef.current = false;
      setIsRecording(false);
      setStatus("idle");
      reportError(err, "Failed to start dictation");
    } finally {
      gate.starting = false;
    }
  }, [
    audio,
    canStart,
    clearStreamingState,
    client,
    enableDuration,
    reportError,
    startDurationTracking,
    startNewStream,
    stopDurationTracking,
  ]);

  const cancelDictation = useCallback(async () => {
    attemptGuardRef.current.cancel();
    const gate = actionGateRef.current;
    if (gate.cancelling) {
      return;
    }
    if (!(isRecordingRef.current || isProcessingRef.current)) {
      return;
    }
    gate.cancelling = true;
    stopDurationTracking();
    setDuration(0);
    setError(null);

    try {
      try {
        senderRef.current?.cancel();
      } catch {
        // no-op
      }
      await audio.stop();
    } catch (err) {
      reportError(err, "Failed to cancel dictation");
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsProcessing(false);
      isProcessingRef.current = false;
      setStatus("idle");
      clearStreamingState();
      gate.cancelling = false;
    }
  }, [audio, clearStreamingState, reportError, stopDurationTracking]);

  const confirmDictation = useCallback(async () => {
    const gate = actionGateRef.current;
    if (gate.confirming) {
      return;
    }
    if (!isRecordingRef.current || isProcessingRef.current) {
      return;
    }
    if (canConfirm && !canConfirm()) {
      return;
    }

    gate.confirming = true;
    setError(null);
    stopDurationTracking();
    setIsProcessing(true);
    isProcessingRef.current = true;

    const attemptId = attemptGuardRef.current.next();

    try {
      await audio.stop();
      attemptGuardRef.current.assertCurrent(attemptId);

      setStatus("uploading");
      isRecordingRef.current = false;
      setIsRecording(false);

      const finalSeq = senderRef.current?.getFinalSeq() ?? -1;
      if (finalSeq < 0) {
        handleStreamingTranscriptionSuccess("", generateId());
        return;
      }

      const transcriptText = await ensureFinalTranscript(finalSeq);
      attemptGuardRef.current.assertCurrent(attemptId);
      handleStreamingTranscriptionSuccess(transcriptText, generateId());
    } catch (err) {
      if (err instanceof Error && err.name === "AttemptCancelledError") {
        return;
      }
      handleDictationFailure(err);
    } finally {
      gate.confirming = false;
    }
  }, [
    audio,
    canConfirm,
    handleDictationFailure,
    handleStreamingTranscriptionSuccess,
    stopDurationTracking,
    ensureFinalTranscript,
  ]);

  const retryFailedDictation = useCallback(async () => {
    if (!senderRef.current?.hasSegments()) {
      return;
    }
    setError(null);
    setStatus("uploading");
    setIsProcessing(true);
    isProcessingRef.current = true;

    try {
      if (!client?.isConnected) {
        throw new Error("Voice client is disconnected");
      }
      senderRef.current.resetStreamForReplay();
      const finalSeq = senderRef.current.getFinalSeq();
      const text = await ensureFinalTranscript(finalSeq);
      handleStreamingTranscriptionSuccess(text, generateId());
    } catch (err) {
      if (err instanceof Error && err.name === "AttemptCancelledError") {
        return;
      }
      handleDictationFailure(err);
    }
  }, [
    client,
    ensureFinalTranscript,
    handleDictationFailure,
    handleStreamingTranscriptionSuccess,
  ]);

  const discardFailedDictation = useCallback(() => {
    setIsProcessing(false);
    isProcessingRef.current = false;
    setDuration(0);
    setStatus("idle");
    setError(null);
    clearStreamingState();
  }, [clearStreamingState]);

  const reset = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsProcessing(false);
    isProcessingRef.current = false;
    stopDurationTracking();
    setDuration(0);
    setError(null);
    setStatus("idle");
    clearStreamingState();
  }, [clearStreamingState, stopDurationTracking]);

  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    cancelRef.current = () => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void cancelDictation();
    };
  }, [cancelDictation]);

  const visibilityRef = useRef<boolean | null>(
    typeof autoStopWhenHidden?.isVisible === "boolean"
      ? autoStopWhenHidden.isVisible
      : null
  );
  useEffect(() => {
    const nextVisible =
      typeof autoStopWhenHidden?.isVisible === "boolean"
        ? autoStopWhenHidden.isVisible
        : null;
    const prevVisible = visibilityRef.current;
    visibilityRef.current = nextVisible;

    if (prevVisible === true && nextVisible === false) {
      attemptGuardRef.current.cancel();

      if (isRecordingRef.current) {
        cancelRef.current?.();
        return;
      }

      if (isProcessingRef.current) {
        stopDurationTracking();
        setDuration(0);
        setIsProcessing(false);
        isProcessingRef.current = false;
        setError(null);
        if (senderRef.current?.hasSegments()) {
          setStatus("failed");
        } else {
          setStatus("idle");
          clearStreamingState();
        }
      }
    }
  }, [
    autoStopWhenHidden?.isVisible,
    clearStreamingState,
    stopDurationTracking,
  ]);

  useEffect(
    () => () => {
      attemptGuardRef.current.cancel();
      stopDurationTracking();
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void audioStopRef.current().catch(() => {
        /* intentional no-op */
      });
    },
    [stopDurationTracking]
  );

  return {
    isRecording,
    isProcessing,
    partialTranscript,
    volume: audio.volume,
    duration,
    error,
    status,
    startDictation,
    cancelDictation,
    confirmDictation,
    retryFailedDictation,
    discardFailedDictation,
    reset,
  };
}
