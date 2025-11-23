// @ts-expect-error - generated types might not be found in check
import type { CreateConnectorInput, InputJsonValue } from "@openplane/db";
import {
  createConnector,
  deleteConnector,
  findConnectorById,
  findConnectorByOrg,
  listConnectorsByOrg,
  pauseConnector as pauseConnectorDb,
  resumeConnector as resumeConnectorDb,
  updateConnectorConfig,
} from "@openplane/db";
import type { AppType } from "@openplane/integrations";
import { appStore } from "@openplane/integrations";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveOrg } from "./middleware";
import {
  appIdSchema,
  createConnectorSchema,
  updateSettingsSchema,
} from "./schemas";
import { cleanupRepeatableJobs, recreateRepeatableJobs } from "./utils";

export const connectorsRouter = createTRPCRouter({
  list: withActiveOrg.query(async ({ ctx }) => {
    const installedConnectors = await listConnectorsByOrg(
      ctx.prisma,
      ctx.orgId
    );

    return appStore.map((app) => {
      const connector = installedConnectors.find(
        (c) => c.app === (app.id as unknown as AppType)
      );

      const isInstalled = connector?.status === "ACTIVE";

      return {
        ...app,
        id: app.id,
        installed: isInstalled,
        connectorId: connector?.id,
        status: connector?.status,
        settings: app.settings,
        userSettings:
          (connector?.config as Record<string, unknown>) ?? undefined,
      };
    });
  }),

  get: withActiveOrg
    .input(z.object({ appId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const appDefinition = appStore.find((a) => a.id === input.appId);

      if (!appDefinition) {
        const connector = await findConnectorById(
          ctx.prisma,
          input.appId,
          true
        );

        if (!connector || connector.organizationId !== ctx.orgId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connector not found or unauthorized",
          });
        }

        return { ...connector };
      }

      const connector = await findConnectorByOrg(
        ctx.prisma,
        ctx.orgId,
        appDefinition.id as unknown as AppType
      );

      return {
        definition: appDefinition,
        connector,
      };
    }),

  connect: withActiveOrg
    .input(createConnectorSchema)
    .mutation(async ({ ctx, input }) => {
      const connectorInput: CreateConnectorInput = {
        organizationId: ctx.orgId,
        userId: ctx.session.user.id,
        app: input.appId,
        workspaceExternalId: input.workspaceExternalId,
        name: input.name,
        type: input.type,
        authType: input.authType,
        config: input.config as InputJsonValue | undefined,
      };

      return await createConnector(ctx.prisma, connectorInput);
    }),

  disconnect: withActiveOrg
    .input(appIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.orgId);
      await cleanupRepeatableJobs(input.appId);
      return await deleteConnector(ctx.prisma, input.appId);
    }),

  updateSettings: withActiveOrg
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.orgId);
      return await updateConnectorConfig(
        ctx.prisma,
        input.appId,
        input.config as InputJsonValue
      );
    }),

  pause: withActiveOrg
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.orgId);
      await cleanupRepeatableJobs(input.connectorId);
      return pauseConnectorDb(ctx.prisma, input.connectorId);
    }),

  resume: withActiveOrg
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.orgId);
      const result = await resumeConnectorDb(ctx.prisma, input.connectorId);
      await recreateRepeatableJobs(ctx.prisma, input.connectorId);
      return result;
    }),
});
