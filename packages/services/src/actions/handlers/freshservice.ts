import {
  addTicketNote,
  createTicket,
  replyToTicket,
  updateTicket,
} from "../../freshservice/actions";
import {
  createFreshserviceClient,
  type FreshserviceClient,
} from "../../freshservice/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: FreshserviceClient,
  p: Record<string, unknown>,
  domain: string
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async ticket_create(client, p, domain) {
    const r = await createTicket(client, {
      domain,
      email: str(p, "email"),
      subject: str(p, "subject"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "number" ? p.priority : undefined,
      status: typeof p.status === "number" ? p.status : undefined,
      type: typeof p.type === "string" ? p.type : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async ticket_update(client, p, domain) {
    const r = await updateTicket(client, {
      domain,
      ticketId:
        typeof p.ticketId === "number"
          ? p.ticketId
          : Number(str(p, "ticketId")),
      status: typeof p.status === "number" ? p.status : undefined,
      priority: typeof p.priority === "number" ? p.priority : undefined,
      subject: typeof p.subject === "string" ? p.subject : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async ticket_note(client, p) {
    const r = await addTicketNote(client, {
      ticketId:
        typeof p.ticketId === "number"
          ? p.ticketId
          : Number(str(p, "ticketId")),
      body: str(p, "body"),
      private: typeof p.private === "boolean" ? p.private : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async ticket_reply(client, p) {
    const r = await replyToTicket(client, {
      ticketId:
        typeof p.ticketId === "number"
          ? p.ticketId
          : Number(str(p, "ticketId")),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "freshservice",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Freshservice action: ${actionId}`,
      };
    }

    const domain = (credentials.config.domain as string) ?? "";

    const client = createFreshserviceClient({
      connectorId,
      apiKey: credentials.accessToken,
      domain,
    });

    return await handler(client, params, domain);
  },
});
