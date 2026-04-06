import {
  createDropboxFolder,
  deleteDropboxEntry,
  moveDropboxEntry,
} from "../../dropbox/actions";
import { createDropboxClient, type DropboxClient } from "../../dropbox/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: DropboxClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async folder_create(client, p) {
    const r = await createDropboxFolder(client, str(p, "path"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, path: r.path, url: r.url } };
  },

  async entry_move(client, p) {
    const r = await moveDropboxEntry(
      client,
      str(p, "fromPath"),
      str(p, "toPath")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, path: r.path, url: r.url } };
  },

  async entry_delete(client, p) {
    const r = await deleteDropboxEntry(client, str(p, "path"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { path: r.path } };
  },
};

registerHandler({
  connectorType: "dropbox",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Dropbox action: ${actionId}`,
      };
    }

    const client = createDropboxClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
