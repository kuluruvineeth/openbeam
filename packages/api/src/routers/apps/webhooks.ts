import { findConnectorById } from "@openbeam/db";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveTeam } from "./middleware";
import { getWebhookStatusSchema } from "./schemas";

export const webhooksRouter = createTRPCRouter({
  getStatus: withActiveTeam
    .input(getWebhookStatusSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const connector = await findConnectorById(ctx.prisma, input.connectorId);
      const webhookConfig = (connector?.webhookConfig ?? null) as
        | {
            enabled?: boolean;
            lastReceivedAt?: string;
            url?: string;
          }
        | null
        | undefined;

      return {
        enabled: webhookConfig?.enabled ?? false,
        lastReceivedAt: webhookConfig?.lastReceivedAt
          ? new Date(webhookConfig.lastReceivedAt)
          : null,
        configured: !!webhookConfig,
      };
    }),
});
