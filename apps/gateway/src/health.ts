import type { Context } from "hono";
import type { ProtocolAdapter } from "./adapters/base-adapter";

interface AdapterHealth {
  state: string;
  lastMessage: number;
  messagesPerMinute: number;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  adapters: Record<string, AdapterHealth>;
  pipeline: {
    queueDepth: number;
    documentsPerMinute: number;
    activeWindows: number;
  };
}

const startTime = Date.now();

export function healthCheck(adapters: Map<string, ProtocolAdapter>) {
  return (c: Context) => {
    const adapterHealth: Record<string, AdapterHealth> = {};
    let hasError = false;
    let hasConnected = false;

    for (const [id, adapter] of adapters) {
      const metrics = adapter.getMetrics();
      const state = adapter.getConnectionState();

      if (state === "error") {
        hasError = true;
      }
      if (state === "connected") {
        hasConnected = true;
      }

      const uptimeMinutes = metrics.connectionUptime / 60_000;
      adapterHealth[id] = {
        state,
        lastMessage: metrics.lastMessageAt,
        messagesPerMinute:
          uptimeMinutes > 0
            ? Math.round(metrics.messagesProcessed / uptimeMinutes)
            : 0,
      };
    }

    let status: HealthResponse["status"] = "healthy";
    if (hasError && hasConnected) {
      status = "degraded";
    }
    if (hasError && !hasConnected && adapters.size > 0) {
      status = "unhealthy";
    }

    const response: HealthResponse = {
      status,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      adapters: adapterHealth,
      pipeline: {
        queueDepth: 0,
        documentsPerMinute: 0,
        activeWindows: 0,
      },
    };

    const statusCode = status === "unhealthy" ? 503 : 200;
    return c.json(response, statusCode);
  };
}
