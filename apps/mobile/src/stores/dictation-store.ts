import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type DictationState = "idle" | "starting" | "recording" | "stopping";
type DictationMode = "idle" | "ptt" | "hands-free";

interface DictationStoreState {
  state: DictationState;
  mode: DictationMode;
  voiceDetected: boolean;
  elapsedMs: number;
  transcript: string;
  interimTranscript: string;
  isMuted: boolean;
  error: string | null;
}

interface DictationStoreActions {
  start: (mode: Exclude<DictationMode, "idle">) => void;
  stop: () => void;
  cancel: () => void;
  setVoiceDetected: (detected: boolean) => void;
  appendTranscript: (text: string) => void;
  setInterimTranscript: (interim: string) => void;
  setMuted: (muted: boolean) => void;
  setError: (error: string | null) => void;
  tick: (deltaMs: number) => void;
  reset: () => void;
}

type DictationStore = DictationStoreState & DictationStoreActions;

const INITIAL_STATE: DictationStoreState = {
  state: "idle",
  mode: "idle",
  voiceDetected: false,
  elapsedMs: 0,
  transcript: "",
  interimTranscript: "",
  isMuted: false,
  error: null,
};

export const useDictationStore = create<DictationStore>()(
  subscribeWithSelector((set) => ({
    ...INITIAL_STATE,

    start: (mode) =>
      set((prev) => {
        if (prev.state !== "idle") {
          return prev;
        }
        return {
          state: "starting",
          mode,
          voiceDetected: false,
          elapsedMs: 0,
          transcript: "",
          interimTranscript: "",
          isMuted: false,
          error: null,
        };
      }),

    stop: () =>
      set((prev) => {
        if (prev.state !== "recording" && prev.state !== "starting") {
          return prev;
        }
        return { state: "stopping" };
      }),

    cancel: () => set(INITIAL_STATE),

    setVoiceDetected: (detected) =>
      set((prev) => {
        if (prev.voiceDetected === detected) {
          return prev;
        }
        return { voiceDetected: detected };
      }),

    appendTranscript: (text) =>
      set((prev) => {
        const separator =
          prev.transcript.length > 0 && !prev.transcript.endsWith(" ")
            ? " "
            : "";
        return {
          transcript: prev.transcript + separator + text,
          interimTranscript: "",
          // Transition from starting → recording on first transcript
          ...(prev.state === "starting" ? { state: "recording" as const } : {}),
        };
      }),

    setInterimTranscript: (interim) =>
      set((prev) => {
        if (prev.interimTranscript === interim) {
          return prev;
        }
        return {
          interimTranscript: interim,
          // Transition from starting → recording on first interim
          ...(prev.state === "starting" ? { state: "recording" as const } : {}),
        };
      }),

    setMuted: (muted) =>
      set((prev) => {
        if (prev.isMuted === muted) {
          return prev;
        }
        return { isMuted: muted };
      }),

    setError: (error) => set({ error, state: "idle", mode: "idle" }),

    tick: (deltaMs) =>
      set((prev) => {
        if (prev.state !== "recording" && prev.state !== "starting") {
          return prev;
        }
        return { elapsedMs: prev.elapsedMs + deltaMs };
      }),

    reset: () => set(INITIAL_STATE),
  }))
);

export type { DictationState, DictationMode, DictationStoreState };
