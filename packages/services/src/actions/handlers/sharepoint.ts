import {
  createMicrosoftGraphClient,
  type MicrosoftGraphClient,
} from "../../microsoft/client";
import { createFolder, moveFile } from "../../sharepoint/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MicrosoftGraphClient,
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
  async folder_create(client, p) {
    const r = await createFolder(client, {
      driveId: str(p, "driveId"),
      parentPath: str(p, "parentPath"),
      folderName: str(p, "folderName"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { fileId: r.fileId, url: r.url } };
  },

  async file_move(client, p) {
    const r = await moveFile(client, {
      driveId: str(p, "driveId"),
      itemId: str(p, "itemId"),
      newParentId: str(p, "newParentId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { fileId: r.fileId, url: r.url } };
  },
};

registerHandler({
  connectorType: "sharepoint",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported SharePoint action: ${actionId}`,
      };
    }

    const client = createMicrosoftGraphClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
