"use client";

import { create } from "zustand";
import type { AgentState, VoiceMode } from "../types";

type VoiceState = {
  mode: VoiceMode;
  agentState: AgentState;
  isConnected: boolean;
  isMuted: boolean;
  transcript: string;
  interimTranscript: string;
  lastAction: string | null;
  error: string | null;
  volumeLevel: number;
};

type VoiceActions = {
  setMode: (mode: VoiceMode) => void;
  setAgentState: (state: AgentState) => void;
  setConnected: (connected: boolean) => void;
  setMuted: (muted: boolean) => void;
  appendTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  setLastAction: (action: string) => void;
  setError: (error: string | null) => void;
  setVolumeLevel: (level: number) => void;
  reset: () => void;
};

const INITIAL_STATE: VoiceState = {
  mode: "idle",
  agentState: "disconnected",
  isConnected: false,
  isMuted: false,
  transcript: "",
  interimTranscript: "",
  lastAction: null,
  error: null,
  volumeLevel: 0,
};

export const useVoiceStore = create<VoiceState & VoiceActions>()((set) => ({
  ...INITIAL_STATE,

  setMode: (mode) => set({ mode }),
  setAgentState: (agentState) => set({ agentState }),
  setConnected: (isConnected) => set({ isConnected }),
  setMuted: (isMuted) => set({ isMuted }),
  appendTranscript: (text) => set((s) => ({ transcript: s.transcript + text })),
  setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
  setLastAction: (lastAction) => set({ lastAction }),
  setError: (error) => set({ error }),
  setVolumeLevel: (volumeLevel) => set({ volumeLevel }),
  reset: () => set(INITIAL_STATE),
}));
