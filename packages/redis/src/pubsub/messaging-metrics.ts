export interface MessagingMetricsHook {
  onPublished(sessionId: string): void;
  onRateLimited(sessionId: string, senderId: string, window: string): void;
  onDeduplicated(sessionId: string, messageId: string): void;
  onDeadLettered(streamKey: string): void;
  onReclaimed(streamKey: string, count: number): void;
  onReprocessed(streamKey: string): void;
}

function noop() {
  /* no-op */
}

const NOOP: MessagingMetricsHook = {
  onPublished: noop,
  onRateLimited: noop,
  onDeduplicated: noop,
  onDeadLettered: noop,
  onReclaimed: noop,
  onReprocessed: noop,
};

let hook: MessagingMetricsHook = NOOP;

export function setMessagingMetricsHook(h: MessagingMetricsHook): void {
  hook = h;
}

export function getMessagingMetricsHook(): MessagingMetricsHook {
  return hook;
}

export function resetMessagingMetricsHook(): void {
  hook = NOOP;
}
