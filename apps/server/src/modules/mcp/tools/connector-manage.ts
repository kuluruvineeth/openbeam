import db, { findConnectorById, updateConnector } from "@openbeam/db";
import { z } from "zod";
import { hasScope, type RegisterTools } from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

export const registerConnectorManageTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "connectors.write")) {
    return;
  }

  server.registerTool(
    "connector_disconnect",
    {
      title: "Disconnect Connector",
      description:
        "Deactivate and disconnect a connector, stopping all future syncs and revoking stored credentials. Previously indexed documents are preserved in the search index and remain searchable — this only stops new data from being synced. Use this when the user wants to remove a data source integration or when a connector is persistently failing and needs to be reconnected from scratch.\n\nReturns the disconnected connector's ID, name, and 'disconnected' status on success. This is a destructive action — always confirm with the user before proceeding, as reconnecting will require re-authorizing (OAuth) or re-entering credentials (API key).\n\nUse connector_list to find the connector ID. After disconnecting, the user can reconnect the same service using connector_setup (OAuth) or connector_configure (API key). Do NOT use this to pause a sync temporarily — there is no 'pause' action; disconnecting fully removes the credential link.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connector to disconnect. Get this from connector_list results."
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async ({ connectorId }) => {
      const connector = await findConnectorById(db, connectorId);

      if (!connector || connector.teamId !== ctx.teamId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or access denied.",
            },
          ],
          isError: true,
        };
      }

      await updateConnector(db, connectorId, { status: "INACTIVE" });

      return {
        content: [
          {
            type: "text" as const,
            text: `Disconnected ${connector.name}. Indexed documents are preserved.`,
          },
        ],
        structuredContent: {
          connectorId,
          name: connector.name,
          status: "disconnected",
        },
      };
    }, "Failed to disconnect connector")
  );
};
