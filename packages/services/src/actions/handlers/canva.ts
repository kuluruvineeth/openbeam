import { createCanvaDesign, createCanvaFolder } from "../../canva/actions";
import { type CanvaClient, createCanvaClient } from "../../canva/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: CanvaClient,
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
  async design_create(client, p) {
    const r = await createCanvaDesign(client, {
      design_type:
        typeof p.design_type === "string" ? p.design_type : undefined,
      title: typeof p.title === "string" ? p.title : undefined,
      width: typeof p.width === "number" ? p.width : undefined,
      height: typeof p.height === "number" ? p.height : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async folder_create(client, p) {
    const r = await createCanvaFolder(client, {
      name: str(p, "name"),
      parent_folder_id:
        typeof p.parent_folder_id === "string" ? p.parent_folder_id : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "canva",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Canva action: ${actionId}`,
      };
    }

    const client = createCanvaClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
