import { getGoogleSiteMetadata } from "../../google-sites/actions";
import {
  createGoogleSitesClient,
  type GoogleSitesClient,
} from "../../google-sites/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: GoogleSitesClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async site_metadata(client, p) {
    const r = await getGoogleSiteMetadata(client, str(p, "siteId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { siteId: r.siteId, url: r.url } };
  },
};

registerHandler({
  connectorType: "google-sites",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Google Sites action: ${actionId}`,
      };
    }

    const client = createGoogleSitesClient({
      connectorId,
      accessToken: credentials.accessToken || undefined,
      userEmail:
        typeof credentials.config.userEmail === "string"
          ? credentials.config.userEmail
          : undefined,
    });

    return await handler(client, params);
  },
});
