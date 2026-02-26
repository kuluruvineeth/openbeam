export const DURATION_TICK_MS = 1000;
export const PCM_DICTATION_FORMAT = "audio/pcm;rate=16000;bits=16";

export const SAMPLE_RATE = 16_000;
export const NUM_CHANNELS = 1;
export const BIT_DEPTH = 16;

export const VOLUME_THRESHOLD = 0.3;
export const SILENCE_DURATION_MS = 2000;
export const SPEECH_CONFIRMATION_MS = 300;
export const DETECTION_GRACE_PERIOD_MS = 150;

export const BUTTON_SIZE = 32;
export const OVERLAY_BUTTON_SIZE = 44;

export const TOAST_COLORS = {
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
} as const;
