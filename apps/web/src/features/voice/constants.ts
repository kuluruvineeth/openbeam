import { env } from "@/env";
import type { AgentState, VoiceMode } from "./types";

export const HOLD_THRESHOLD_MS = 300;

export const STATE_LABELS: Record<AgentState, string> = {
  disconnected: "Ready",
  connecting: "Connecting",
  initializing: "Starting",
  listening: "Listening",
  thinking: "Processing",
  speaking: "Speaking",
};

export const LIVEKIT_WS_URL = env.NEXT_PUBLIC_LIVEKIT_WS_URL;

export const MODE_ACCENT: Record<Exclude<VoiceMode, "idle">, string> = {
  dictation: "#10b981",
  action: "#3b82f6",
};

export const WAVEFORM = {
  BAR_COUNT: 16,
  BAR_WIDTH: 2,
  BAR_GAP: 1.5,
  MIN_HEIGHT: 2,
  MAX_HEIGHT: 24,
  LERP_SPEED: 0.1,
} as const;
