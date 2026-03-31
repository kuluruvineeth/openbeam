import {
  createActionItem,
  updateActionItem,
} from "../../fellow/actions/action-items";
import { addMeetingNote } from "../../fellow/actions/meetings";
import { createFellowClient, type FellowClient } from "../../fellow/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: FellowClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async action_item_create(client, p) {
    const r = await createActionItem(client, {
      title: str(p, "title"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      assignee_email:
        typeof p.assignee_email === "string" ? p.assignee_email : undefined,
      due_date: typeof p.due_date === "string" ? p.due_date : undefined,
      meeting_id: typeof p.meeting_id === "string" ? p.meeting_id : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async action_item_update(client, p) {
    const r = await updateActionItem(client, {
      actionItemId: str(p, "actionItemId"),
      title: typeof p.title === "string" ? p.title : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      completed: typeof p.completed === "boolean" ? p.completed : undefined,
      due_date: typeof p.due_date === "string" ? p.due_date : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async meeting_note_add(client, p) {
    const r = await addMeetingNote(client, {
      meetingId: str(p, "meetingId"),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "fellow",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Fellow action: ${actionId}`,
      };
    }

    const client = createFellowClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
