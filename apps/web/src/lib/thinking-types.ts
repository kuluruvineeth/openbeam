export type ThinkingState = {
  content: string;
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  durationMs: number | null;
};

export type ThinkingStep = {
  id: string;
  name: string;
  displayName: string;
  status: "pending" | "active" | "completed";
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

export const EMPTY_THINKING_STATE: ThinkingState = {
  content: "",
  isActive: false,
  startTime: null,
  endTime: null,
  durationMs: null,
};

export function formatThinkingDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
