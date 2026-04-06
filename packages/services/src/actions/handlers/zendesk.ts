import {
  addZendeskComment,
  createZendeskTicket,
  updateZendeskTicket,
} from "../../zendesk/actions";
import { createZendeskClient, type ZendeskClient } from "../../zendesk/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: ZendeskClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.fields === "object" && p.fields !== null ? p.fields : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async ticket_create(client, p) {
    const r = await createZendeskTicket(client, {
      subject: str(p, "subject"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
      type: typeof p.type === "string" ? p.type : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ticketId: r.ticketId, url: r.url } };
  },

  async ticket_update(client, p) {
    const ticketId =
      typeof p.ticketId === "number" ? p.ticketId : Number(str(p, "ticketId"));
    const r = await updateZendeskTicket(client, ticketId, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ticketId: r.ticketId, url: r.url } };
  },

  async ticket_comment(client, p) {
    const ticketId =
      typeof p.ticketId === "number" ? p.ticketId : Number(str(p, "ticketId"));
    const isPublic = typeof p.isPublic === "boolean" ? p.isPublic : true;
    const r = await addZendeskComment(
      client,
      ticketId,
      str(p, "body"),
      isPublic
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ticketId: r.ticketId, url: r.url } };
  },
};

registerHandler({
  connectorType: "zendesk",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Zendesk action: ${actionId}`,
      };
    }

    const client = createZendeskClient({
      connectorId,
      accessToken: credentials.accessToken,
      subdomain: (credentials.config.subdomain as string) ?? "",
    });

    return await handler(client, params);
  },
});
