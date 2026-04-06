import {
  createEgnyteFolder,
  createEgnyteSharedLink,
  deleteEgnyteItem,
} from "../../egnyte/actions";
import { createEgnyteClient, type EgnyteClient } from "../../egnyte/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: EgnyteClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async folder_create(client, p) {
    const r = await createEgnyteFolder(client, str(p, "path"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { path: r.path, url: r.url } };
  },

  async item_delete(client, p) {
    const r = await deleteEgnyteItem(client, str(p, "path"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { path: r.path } };
  },

  async shared_link_create(client, p) {
    const linkType =
      typeof p.linkType === "string" &&
      (p.linkType === "file" || p.linkType === "folder")
        ? p.linkType
        : "file";
    const accessibility =
      typeof p.accessibility === "string" ? p.accessibility : "domain";
    const r = await createEgnyteSharedLink(
      client,
      str(p, "path"),
      linkType,
      accessibility
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { linkId: r.linkId, url: r.url } };
  },
};

registerHandler({
  connectorType: "egnyte",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Egnyte action: ${actionId}`,
      };
    }

    const client = createEgnyteClient({
      connectorId,
      accessToken: credentials.accessToken,
      domain: (credentials.config.domain as string) ?? "",
    });

    return await handler(client, params);
  },
});
