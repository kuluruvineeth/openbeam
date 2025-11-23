import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveOrg } from "./middleware";
import { getWebhookStatusSchema } from "./schemas";

export const webhooksRouter = createTRPCRouter({
  getStatus: withActiveOrg
    .input(getWebhookStatusSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.orgId);
      const connectorDetails = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId },
        select: {
          webhookConfig: true,
        },
      });

      const webhookConfig = connectorDetails?.webhookConfig as
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
