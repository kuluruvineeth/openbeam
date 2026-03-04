import type {
  AggregationConfig,
  TimeSeriesWindow,
} from "@openplane/types/services/connectors/common/industrial";
import type { InternalMessage } from "@openplane/types/services/connectors/mqtt";

interface WindowState {
  startTime: number;
  values: number[];
  timestamps: number[];
}

type WindowFlushCallback = (
  topic: string,
  connectorId: string,
  window: TimeSeriesWindow
) => void;

const FREQUENCY_THRESHOLDS = {
  PASSTHROUGH: 1,
  STANDARD: 100,
  HIGH: 1000,
} as const;

const WINDOW_SECONDS = {
  STANDARD: 60,
  HIGH: 300,
  EXTREME: 900,
} as const;

interface FlushParams {
  key: string;
  connectorId: string;
  topic: string;
  windowSeconds: number;
  unit: string;
}

export class MessageAggregator {
  private readonly windows = new Map<string, WindowState>();
  private readonly messageRates = new Map<string, number[]>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly config: AggregationConfig;
  private readonly onFlush: WindowFlushCallback;

  constructor(config: AggregationConfig, onFlush: WindowFlushCallback) {
    this.config = config;
    this.onFlush = onFlush;
  }

  process(
    message: InternalMessage,
    unit: string,
    windowOverride?: number
  ): TimeSeriesWindow | null {
    const windowSeconds =
      windowOverride ?? this.determineWindowSize(message.topic);

    if (windowSeconds === 0 && this.config.eventPassthrough) {
      return null;
    }

    const key = `${message.connectorId}:${message.topic}`;
    const value = this.extractNumericValue(message.payload);

    if (value === null) {
      return null;
    }

    this.trackMessageRate(key);

    let window = this.windows.get(key);
    if (!window) {
      window = {
        startTime: message.timestamp,
        values: [],
        timestamps: [],
      };
      this.windows.set(key, window);
      this.scheduleFlush({
        key,
        connectorId: message.connectorId,
        topic: message.topic,
        windowSeconds,
        unit,
      });
    }

    window.values.push(value);
    window.timestamps.push(message.timestamp);

    if (window.values.length >= this.config.maxWindowSize) {
      return this.flushWindow(key, message.connectorId, message.topic, unit);
    }

    return null;
  }

  shouldPassthrough(message: InternalMessage): boolean {
    if (!this.config.eventPassthrough) {
      return false;
    }
    return this.isEventMessage(message);
  }

  flush(): void {
    for (const [key, window] of this.windows) {
      if (window.values.length === 0) {
        continue;
      }
      const [connectorId, topic] = this.parseKey(key);
      this.flushWindow(key, connectorId, topic, "");
    }
  }

  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.flush();
    this.windows.clear();
    this.messageRates.clear();
    this.timers.clear();
  }

  private scheduleFlush(params: FlushParams): void {
    const { key, connectorId, topic, windowSeconds, unit } = params;
    const timer = setTimeout(() => {
      this.flushWindow(key, connectorId, topic, unit);
      this.timers.delete(key);
    }, windowSeconds * 1000);

    this.timers.set(key, timer);
  }

  private flushWindow(
    key: string,
    connectorId: string,
    topic: string,
    unit: string
  ): TimeSeriesWindow | null {
    const window = this.windows.get(key);
    if (!window || window.values.length === 0) {
      return null;
    }

    const result = this.computeWindow(window, unit);
    this.onFlush(topic, connectorId, result);

    this.windows.delete(key);
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(key);
    }

    return result;
  }

  private computeWindow(state: WindowState, unit: string): TimeSeriesWindow {
    const { values, timestamps } = state;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const variance =
      values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;

    return {
      startTime: state.startTime,
      endTime: timestamps.at(-1) ?? state.startTime,
      sampleCount: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg,
      first: values[0] ?? 0,
      last: values.at(-1) ?? 0,
      stdDev: Math.sqrt(variance),
      unit,
    };
  }

  private determineWindowSize(topic: string): number {
    const rate = this.getMessageRate(topic);

    if (rate < FREQUENCY_THRESHOLDS.PASSTHROUGH) {
      return 0;
    }
    if (rate < FREQUENCY_THRESHOLDS.STANDARD) {
      return this.config.defaultWindowSeconds;
    }
    if (rate < FREQUENCY_THRESHOLDS.HIGH) {
      return WINDOW_SECONDS.HIGH;
    }
    return WINDOW_SECONDS.EXTREME;
  }

  private getMessageRate(topic: string): number {
    const timestamps = this.messageRates.get(topic);
    if (!timestamps || timestamps.length < 2) {
      return 0;
    }

    const oldest = timestamps[0];
    const newest = timestamps.at(-1);
    if (oldest === undefined || newest === undefined) {
      return 0;
    }
    const durationSeconds = (newest - oldest) / 1000;

    if (durationSeconds === 0) {
      return 0;
    }
    return timestamps.length / durationSeconds;
  }

  private trackMessageRate(key: string): void {
    const now = Date.now();
    let timestamps = this.messageRates.get(key);
    if (!timestamps) {
      timestamps = [];
      this.messageRates.set(key, timestamps);
    }

    timestamps.push(now);

    const cutoff = now - 60_000;
    while (
      timestamps.length > 0 &&
      timestamps[0] !== undefined &&
      timestamps[0] < cutoff
    ) {
      timestamps.shift();
    }
  }

  private extractNumericValue(payload: Record<string, unknown>): number | null {
    if (typeof payload.value === "number") {
      return payload.value;
    }
    if (typeof payload.val === "number") {
      return payload.val;
    }

    const metrics = payload.metrics as Record<string, unknown> | undefined;
    if (metrics) {
      const firstMetric = Object.values(metrics)[0] as
        | { value?: unknown }
        | undefined;
      if (typeof firstMetric?.value === "number") {
        return firstMetric.value;
      }
    }

    for (const val of Object.values(payload)) {
      if (typeof val === "number" && !Number.isNaN(val)) {
        return val;
      }
    }

    return null;
  }

  private isEventMessage(message: InternalMessage): boolean {
    const topic = message.topic.toLowerCase();
    const eventPatterns = [
      "alarm",
      "alert",
      "event",
      "state",
      "birth",
      "death",
      "cmd",
      "status",
    ];
    return eventPatterns.some((pattern) => topic.includes(pattern));
  }

  private parseKey(key: string): [string, string] {
    const idx = key.indexOf(":");
    return [key.substring(0, idx), key.substring(idx + 1)];
  }
}
