import {
  createZoomMeeting,
  deleteZoomMeeting,
  listZoomUsers,
  updateZoomMeeting,
} from "../../zoom/actions";
import { createZoomClient, type ZoomClient } from "../../zoom/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: ZoomClient,
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
  async user_list(client) {
    const r = await listZoomUsers(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { users: r.users } };
  },

  async meeting_create(client, p) {
    const r = await createZoomMeeting(client, {
      userId: str(p, "userId"),
      topic: str(p, "topic"),
      type: typeof p.type === "number" ? p.type : undefined,
      start_time: typeof p.start_time === "string" ? p.start_time : undefined,
      duration: typeof p.duration === "number" ? p.duration : undefined,
      timezone: typeof p.timezone === "string" ? p.timezone : undefined,
      agenda: typeof p.agenda === "string" ? p.agenda : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { meetingId: r.meetingId, joinUrl: r.joinUrl },
    };
  },

  async meeting_update(client, p) {
    const r = await updateZoomMeeting(client, {
      meetingId: num(p, "meetingId"),
      topic: typeof p.topic === "string" ? p.topic : undefined,
      start_time: typeof p.start_time === "string" ? p.start_time : undefined,
      duration: typeof p.duration === "number" ? p.duration : undefined,
      timezone: typeof p.timezone === "string" ? p.timezone : undefined,
      agenda: typeof p.agenda === "string" ? p.agenda : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { meetingId: r.meetingId } };
  },

  async meeting_delete(client, p) {
    const r = await deleteZoomMeeting(client, num(p, "meetingId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },
};

registerHandler({
  connectorType: "zoom",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Zoom action: ${actionId}`,
      };
    }

    const client = createZoomClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
