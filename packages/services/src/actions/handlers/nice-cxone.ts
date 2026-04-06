import {
  addContactNote,
  createContactSignal,
  updateAgentState,
} from "../../nice-cxone/actions";
import {
  createNiceCxoneClient,
  type NiceCxoneClient,
} from "../../nice-cxone/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: NiceCxoneClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.properties === "object" && p.properties !== null ? p.properties : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async contact_note(client, p) {
    const r = await addContactNote(client, str(p, "contactId"), str(p, "note"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async contact_signal_create(client, p) {
    const r = await createContactSignal(client, str(p, "skillId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async agent_state_update(client, p) {
    const r = await updateAgentState(
      client,
      str(p, "agentId"),
      str(p, "state")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "nice-cxone",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported NICE CXone action: ${actionId}`,
      };
    }

    const client = createNiceCxoneClient({
      connectorId,
      accessToken: credentials.accessToken,
      baseUrl: (credentials.config.baseUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
