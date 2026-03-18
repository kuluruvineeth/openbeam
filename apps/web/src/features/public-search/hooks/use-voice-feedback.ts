"use client";

import { useCallback, useRef, useState } from "react";
import { useMicrophoneVisualizer } from "@/hooks/use-microphone-visualizer";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

type FeedbackCategory = "data-request" | "bug" | "enhancement" | "ux-feedback";

type VoiceFeedbackState =
  | "idle"
  | "listening"
  | "committed"
  | "processing"
  | "done"
  | "error";

type UseVoiceFeedbackReturn = {
  state: VoiceFeedbackState;
  transcript: string;
  interimTranscript: string;
  setTranscript: (text: string) => void;
  category: FeedbackCategory;
  setCategory: (cat: FeedbackCategory) => void;
  bands: number[];
  volume: number;
  isSupported: boolean;
  error: string | null;
  duration: number;
  startRecording: () => void;
  stopRecording: () => void;
  submit: () => Promise<void>;
  discard: () => void;
};

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "";

export function useVoiceFeedback(page: string): UseVoiceFeedbackReturn {
  const [state, setState] = useState<VoiceFeedbackState>("idle");
  const [editedTranscript, setEditedTranscript] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("ux-feedback");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const usedVoiceRef = useRef(false);
  const durationTimerRef = useRef<ReturnType<typeof setInterval>>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const visualizer = useMicrophoneVisualizer();
  const visualizerRef = useRef(visualizer);
  visualizerRef.current = visualizer;

  const noop = Function.prototype as () => void;
  const releaseStreamRef = useRef<() => void>(noop);

  const speech = useSpeechRecognition({
    continuous: true,
    onTranscript: (text) => {
      setEditedTranscript(text);
      setState("committed");
      releaseStreamRef.current();
    },
  });
  const speechRef = useRef(speech);
  speechRef.current = speech;

  const releaseStream = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    visualizerRef.current.stop();
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);
  releaseStreamRef.current = releaseStream;

  const startRecording = useCallback(async () => {
    setSubmitError(null);
    setEditedTranscript("");
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      visualizerRef.current.start(stream);
      speechRef.current.reset();
      speechRef.current.start();
      usedVoiceRef.current = true;
      setState("listening");

      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      setState("error");
      setSubmitError("Microphone access denied.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    speechRef.current.stop();
    releaseStream();
    const finalText =
      speechRef.current.transcript || speechRef.current.interimTranscript;
    if (finalText) {
      setEditedTranscript(finalText);
      setState("committed");
    } else {
      setState("idle");
    }
  }, [releaseStream]);

  const submit = useCallback(async () => {
    if (!editedTranscript.trim() || editedTranscript.trim().length < 10) {
      setSubmitError("Please provide at least 10 characters of feedback.");
      return;
    }

    setState("processing");
    setSubmitError(null);

    try {
      const searchParams = new URLSearchParams(window.location.search);

      const response = await fetch(`${SERVER_URL}/api/v1/public/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editedTranscript.trim(),
          category,
          page,
          inputMethod: usedVoiceRef.current ? "voice" : "text",
          context: {
            lastQuery: searchParams.get("q") ?? undefined,
            dataset: searchParams.get("dataset") ?? undefined,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          setSubmitError("Too many submissions. Try again later.");
          setState("error");
          return;
        }
        throw new Error("Submit failed");
      }

      setState("done");
    } catch {
      setSubmitError("Failed to submit. Try again.");
      setState("error");
    }
  }, [editedTranscript, category, page]);

  const discard = useCallback(() => {
    speechRef.current.reset();
    releaseStream();
    usedVoiceRef.current = false;
    setEditedTranscript("");
    setCategory("ux-feedback");
    setDuration(0);
    setSubmitError(null);
    setState("idle");
  }, [releaseStream]);

  return {
    state,
    transcript: editedTranscript,
    interimTranscript: speech.interimTranscript,
    setTranscript: setEditedTranscript,
    category,
    setCategory,
    bands: visualizer.bands,
    volume: visualizer.volume,
    isSupported: speech.isSupported,
    error: submitError ?? speech.error,
    duration,
    startRecording,
    stopRecording,
    submit,
    discard,
  };
}
