import {
  createPipedriveActivity,
  createPipedriveDeal,
  createPipedriveNote,
  createPipedrivePerson,
  listPipedriveOrganizations,
  listPipedrivePersons,
  updatePipedriveDeal,
} from "../../pipedrive/actions";
import {
  createPipedriveClient,
  type PipedriveClient,
} from "../../pipedrive/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: PipedriveClient,
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
  async person_list(client) {
    const r = await listPipedrivePersons(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { persons: r.persons } };
  },

  async org_list(client) {
    const r = await listPipedriveOrganizations(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { organizations: r.organizations } };
  },

  async deal_create(client, p) {
    const r = await createPipedriveDeal(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async deal_update(client, p) {
    const r = await updatePipedriveDeal(client, str(p, "dealId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async person_create(client, p) {
    const r = await createPipedrivePerson(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async note_create(client, p) {
    const r = await createPipedriveNote(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async activity_create(client, p) {
    const r = await createPipedriveActivity(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "pipedrive",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Pipedrive action: ${actionId}`,
      };
    }

    const client = createPipedriveClient({
      connectorId,
      accessToken: credentials.accessToken,
      companyDomain: (credentials.config.companyDomain as string) ?? "",
    });

    return await handler(client, params);
  },
});
