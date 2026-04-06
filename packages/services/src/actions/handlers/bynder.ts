import {
  addAssetToBynderCollection,
  createBynderCollection,
} from "../../bynder/actions";
import { type BynderClient, createBynderClient } from "../../bynder/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: BynderClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async collection_create(client, p) {
    const r = await createBynderCollection(
      client,
      str(p, "name"),
      typeof p.description === "string" ? p.description : undefined
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { collectionId: r.collectionId, url: r.url },
    };
  },

  async collection_add_asset(client, p) {
    const r = await addAssetToBynderCollection(
      client,
      str(p, "collectionId"),
      str(p, "assetId")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { collectionId: r.collectionId, url: r.url },
    };
  },
};

registerHandler({
  connectorType: "bynder",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Bynder action: ${actionId}`,
      };
    }

    const client = createBynderClient({
      connectorId,
      accessToken: credentials.accessToken,
      domain: (credentials.config.domain as string) ?? "",
    });

    return await handler(client, params);
  },
});
