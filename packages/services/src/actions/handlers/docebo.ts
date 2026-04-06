import {
  createDoceboEnrollment,
  updateDoceboCourse,
} from "../../docebo/actions";
import { createDoceboClient, type DoceboClient } from "../../docebo/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: DoceboClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.properties === "object" && p.properties !== null ? p.properties : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async enrollment_create(client, p) {
    const r = await createDoceboEnrollment(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async course_update(client, p) {
    const r = await updateDoceboCourse(client, str(p, "courseId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "docebo",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Docebo action: ${actionId}`,
      };
    }

    const client = createDoceboClient({
      connectorId,
      accessToken: credentials.accessToken,
      instanceUrl: (credentials.config.instanceUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
