import {
  type Database,
  findConnectorById,
  findConnectorByTeam,
  listConnectorResources,
  listConnectorsByTeam,
  type Prisma,
  softDeleteConnector,
  updateConnectorConfig,
  updateConnectorResourceSync,
  upsertConnector,
} from "@openbeam/db";
import {
  appStore,
  type SettingValue,
  type UnifiedApp,
} from "@openbeam/integrations";
import {
  type ApiAccessAuthContext,
  getConnectorResourceTeamId,
  isSessionAdminForTeam,
  resolveWriteUserIdForAuthContext,
} from "./api-access";
import { createResolveTeamId } from "./lib/service-errors";

export type AppsServiceErrorCode =
  | "MISSING_TEAM"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "NO_TEAM_USER";

export class AppsServiceError extends Error {
  readonly code: AppsServiceErrorCode;

  constructor(code: AppsServiceErrorCode, message: string) {
    super(message);
    this.name = "AppsServiceError";
    this.code = code;
  }
}

type ConnectorCreatePayload = Parameters<typeof upsertConnector>[1];

const resolveTeamId = createResolveTeamId(AppsServiceError);

function connectorSettings(
  config: unknown
): Record<string, SettingValue> | undefined {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return;
  }
  return config as Record<string, SettingValue>;
}

export async function listConnectorsForTeam(
  db: Database,
  input: { teamId: string | null }
) {
  const teamId = resolveTeamId(input.teamId);
  const installedConnectors = await listConnectorsByTeam(db, teamId);

  const connectors = appStore.map((app) => {
    const connector = installedConnectors.find(
      (installed) => installed.app === app.id
    );

    return {
      ...app,
      id: app.id,
      installed: connector?.status === "ACTIVE",
      connectorId: connector?.id,
      status: connector?.status,
      settings: app.settings,
      userSettings: connectorSettings(connector?.config),
    };
  });

  return { connectors };
}

export async function getConnectorForTeam(
  db: Database,
  input: { teamId: string | null; id: string }
) {
  const teamId = resolveTeamId(input.teamId);
  const appDefinition = appStore.find((app) => app.id === input.id);

  if (appDefinition) {
    const connector = await findConnectorByTeam(db, teamId, appDefinition.id);
    if (!connector) {
      throw new AppsServiceError("NOT_FOUND", "Connector not found");
    }

    return {
      ...connector,
      definition: appDefinition as UnifiedApp,
    };
  }

  const connector = await findConnectorById(db, input.id, true);
  if (!connector || connector.teamId !== teamId) {
    throw new AppsServiceError(
      "NOT_FOUND",
      "Connector not found or unauthorized"
    );
  }

  const connectorAppDefinition = appStore.find(
    (app) => app.id.toUpperCase() === connector.app.toUpperCase()
  );

  return {
    ...connector,
    definition: connectorAppDefinition ?? null,
  };
}

export async function createConnectorForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    appId: ConnectorCreatePayload["app"];
    workspaceExternalId: ConnectorCreatePayload["workspaceExternalId"];
    name: ConnectorCreatePayload["name"];
    type: ConnectorCreatePayload["type"];
    authType: ConnectorCreatePayload["authType"];
    config: ConnectorCreatePayload["config"];
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserIdForAuthContext(
    db,
    input.authContext,
    teamId
  );

  if (!userId) {
    throw new AppsServiceError(
      "NO_TEAM_USER",
      "No team user is available for connector ownership"
    );
  }

  return upsertConnector(db, {
    teamId,
    userId,
    app: input.appId,
    workspaceExternalId: input.workspaceExternalId,
    name: input.name,
    type: input.type,
    authType: input.authType,
    config: input.config,
  });
}

export async function updateConnectorConfigForTeam(
  db: Database,
  input: {
    teamId: string | null;
    connectorId: string;
    config: Record<string, unknown>;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const connector = await findConnectorById(db, input.connectorId);

  if (!connector || connector.teamId !== teamId) {
    throw new AppsServiceError(
      "NOT_FOUND",
      "Connector not found or unauthorized"
    );
  }

  return updateConnectorConfig(
    db,
    input.connectorId,
    input.config as Prisma.InputJsonValue
  );
}

export async function deleteConnectorForTeam(
  db: Database,
  input: {
    teamId: string | null;
    connectorId: string;
    authContext: ApiAccessAuthContext;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const connector = await findConnectorById(db, input.connectorId);

  if (!connector || connector.teamId !== teamId) {
    throw new AppsServiceError(
      "NOT_FOUND",
      "Connector not found or unauthorized"
    );
  }

  const isAdmin = await isSessionAdminForTeam(db, input.authContext, teamId);
  if (!isAdmin) {
    throw new AppsServiceError("FORBIDDEN", "Admin or Owner role required");
  }

  const deletedBy =
    input.authContext.type === "session"
      ? input.authContext.userId
      : `api_key:${input.authContext.type === "apiKey" ? (input.authContext.apiKeyId ?? "unknown") : "unknown"}`;

  return softDeleteConnector(db, input.connectorId, deletedBy);
}

export async function listConnectorResourcesForTeam(
  db: Database,
  input: {
    teamId: string | null;
    connectorId: string;
    search?: string;
    cursor?: string;
    limit: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const connector = await findConnectorById(db, input.connectorId);

  if (!connector || connector.teamId !== teamId) {
    throw new AppsServiceError(
      "NOT_FOUND",
      "Connector not found or unauthorized"
    );
  }

  return listConnectorResources(db, input.connectorId, {
    search: input.search,
    cursor: input.cursor,
    limit: input.limit,
  });
}

export async function updateConnectorResourceForTeam(
  db: Database,
  input: {
    teamId: string | null;
    resourceId: string;
    syncEnabled: boolean;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const resourceTeamId = await getConnectorResourceTeamId(db, input.resourceId);

  if (!resourceTeamId || resourceTeamId !== teamId) {
    throw new AppsServiceError(
      "NOT_FOUND",
      "Resource not found or unauthorized"
    );
  }

  return updateConnectorResourceSync(db, input.resourceId, input.syncEnabled);
}
