import { disableJob, enableJob, triggerBuild } from "../../jenkins/actions";
import { createJenkinsClient, type JenkinsClient } from "../../jenkins/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: JenkinsClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async build_trigger(client, p) {
    const r = await triggerBuild(client, str(p, "jobPath"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async job_disable(client, p) {
    const r = await disableJob(client, str(p, "jobPath"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { disabled: true } };
  },

  async job_enable(client, p) {
    const r = await enableJob(client, str(p, "jobPath"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { enabled: true } };
  },
};

registerHandler({
  connectorType: "jenkins",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Jenkins action: ${actionId}`,
      };
    }

    const client = createJenkinsClient({
      connectorId: "",
      instanceUrl: (credentials.config.instanceUrl as string) ?? "",
      username: (credentials.config.username as string) ?? "",
      apiToken: (credentials.config.apiToken as string) ?? "",
    });

    return await handler(client, params);
  },
});
