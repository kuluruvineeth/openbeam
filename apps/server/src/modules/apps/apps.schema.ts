import { z } from "@hono/zod-openapi";
import {
  AppTypeSchema,
  AuthTypeSchema,
  ConnectorTypeSchema,
} from "@openplane/integrations";

export const connectorIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const resourceIdParamsSchema = z.object({
  resourceId: z.string().openapi({
    param: {
      name: "resourceId",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u1000",
  }),
});

export const listConnectorResourcesQuerySchema = z.object({
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const createConnectorBodySchema = z.object({
  appId: AppTypeSchema,
  workspaceExternalId: z.string().min(1),
  name: z.string().min(1),
  type: ConnectorTypeSchema,
  authType: AuthTypeSchema,
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateConnectorBodySchema = z.object({
  config: z.record(z.string(), z.unknown()),
});

export const updateConnectorResourceBodySchema = z.object({
  syncEnabled: z.boolean(),
});

export const unknownResponseSchema = z.unknown();

export const errorSchema = z.object({
  error: z.string(),
});
