import {
  createMonitor,
  muteMonitor,
  unmuteMonitor,
  updateMonitor,
} from "../../datadog/actions";
import { createDatadogClient, type DatadogClient } from "../../datadog/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: DatadogClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function num(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    throw new Error(`${key} must be a number`);
  }
  return n;
}

const actions: Record<string, Handler> = {
  async monitor_create(client, p) {
    const r = await createMonitor(client, {
      name: str(p, "name"),
      type: str(p, "type"),
      query: str(p, "query"),
      message: typeof p.message === "string" ? p.message : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
      priority: typeof p.priority === "number" ? p.priority : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async monitor_update(client, p) {
    const r = await updateMonitor(client, {
      monitorId: num(p, "monitorId"),
      name: typeof p.name === "string" ? p.name : undefined,
      query: typeof p.query === "string" ? p.query : undefined,
      message: typeof p.message === "string" ? p.message : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
      priority: typeof p.priority === "number" ? p.priority : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async monitor_mute(client, p) {
    const r = await muteMonitor(client, {
      monitorId: num(p, "monitorId"),
      scope: typeof p.scope === "string" ? p.scope : undefined,
      end: typeof p.end === "number" ? p.end : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { muted: true } };
  },

  async monitor_unmute(client, p) {
    const r = await unmuteMonitor(client, {
      monitorId: num(p, "monitorId"),
      scope: typeof p.scope === "string" ? p.scope : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { unmuted: true } };
  },
};

registerHandler({
  connectorType: "datadog",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Datadog action: ${actionId}`,
      };
    }

    const client = createDatadogClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      appKey: (credentials.config.appKey as string) ?? "",
      site:
        typeof credentials.config.site === "string"
          ? (credentials.config.site as
              | "us1"
              | "us3"
              | "us5"
              | "eu"
              | "ap1"
              | "gov")
          : "us1",
    });

    return await handler(client, params);
  },
});
