import type { Connector, User } from "@openbeam/db";

export type ConnectorResult = {
  connector: Connector;
  redirectUrl?: string;
};

export type AuthStartContext = {
  user: User | { id: string };
  workspaceId: string;
  redirectUrl?: string;
  connectorId?: string;
};

export type AuthCompleteContext = {
  code: string;
  state: string;
};

export type IntegrationAuth = {
  start(ctx: AuthStartContext): Promise<string>;
  complete(ctx: AuthCompleteContext): Promise<ConnectorResult>;
};

export type ServiceAccountAuthContext = {
  user: User | { id: string };
  workspaceId: string;
  connectorId: string;
  credentials?: string;
  delegatedEmail?: string;
};

export type IntegrationServiceAccountAuth = {
  authenticate(ctx: ServiceAccountAuthContext): Promise<ConnectorResult>;
};
