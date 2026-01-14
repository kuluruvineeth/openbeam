import { z } from "zod";
import {
  AppTypeSchema,
  AuthTypeSchema,
  ConnectorTypeSchema,
} from "../connectors/enums";

export const ConnectorConfigSchema = z
  .record(z.string(), z.unknown())
  .optional();

export type ConnectorConfig = z.infer<typeof ConnectorConfigSchema>;

export const CreateConnectorInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  app: AppTypeSchema,
  workspaceExternalId: z.string().min(1),
  name: z.string().min(1).max(255),
  type: ConnectorTypeSchema,
  authType: AuthTypeSchema,
  config: ConnectorConfigSchema,
});

export type CreateConnectorInput = z.infer<typeof CreateConnectorInputSchema>;

export const ActivateConnectorInputSchema = z.object({
  workspaceExternalId: z.string().min(1),
  name: z.string().min(1).max(255),
  config: z.record(z.string(), z.unknown()),
});

export type ActivateConnectorInput = z.infer<
  typeof ActivateConnectorInputSchema
>;

export const CreateConnectorWithOAuthInputSchema =
  CreateConnectorInputSchema.extend({
    accessToken: z.string().min(1),
    refreshToken: z.string().nullable().optional(),
    tokenExpiresAt: z.coerce.date().nullable().optional(),
    tokenExpiresIn: z.number().int().positive().optional(),
    scopes: z.array(z.string()).optional(),
    tokenType: z.string().optional().default("Bearer"),
    clientId: z.string().nullable().optional(),
    clientSecret: z.string().nullable().optional(),
  });

export type CreateConnectorWithOAuthInput = z.infer<
  typeof CreateConnectorWithOAuthInputSchema
>;
