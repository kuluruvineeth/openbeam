import type { Connector, User } from "@openplane/db";

export interface ConnectorResult {
  connector: Connector;
  redirectUrl?: string;
}

export interface IntegrationAuth {
  start(ctx: {
    user: User;
    workspaceId: string;
    redirectUrl?: string;
    connectorId?: string;
  }): Promise<string>;

  complete(ctx: { code: string; state: string }): Promise<ConnectorResult>;
}
