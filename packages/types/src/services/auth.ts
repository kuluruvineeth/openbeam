import { z } from "zod";

export const OAuthStateSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  connectorId: z.string(),
  redirectUrl: z.string().optional(),
  timestamp: z.number(),
});

export type OAuthState = z.infer<typeof OAuthStateSchema>;

export const AuthStartContextSchema = z.object({
  user: z.object({ id: z.string() }),
  workspaceId: z.string(),
  redirectUrl: z.string().optional(),
  connectorId: z.string().optional(),
});

export type AuthStartContext = z.infer<typeof AuthStartContextSchema>;

export const AuthCompleteContextSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export type AuthCompleteContext = z.infer<typeof AuthCompleteContextSchema>;

export const ServiceAccountAuthContextSchema = z.object({
  user: z.object({ id: z.string() }),
  workspaceId: z.string(),
  connectorId: z.string(),
  credentials: z.string().optional(),
  delegatedEmail: z.string().optional(),
});

export type ServiceAccountAuthContext = z.infer<
  typeof ServiceAccountAuthContextSchema
>;

export interface ConnectorResult {
  connector: {
    id: string;
    name: string;
    teamId: string;
    app: string;
    type: string;
    authType: string;
    status: string;
  };
  redirectUrl?: string;
}

export interface IntegrationAuth {
  start(ctx: AuthStartContext): Promise<string>;
  complete(ctx: AuthCompleteContext): Promise<ConnectorResult>;
}

export interface IntegrationServiceAccountAuth {
  authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult>;
}
