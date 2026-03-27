import {
  awsIotFullSync,
  awsIotIncrementalSync,
  azureIotFullSync,
  azureIotIncrementalSync,
  bacnetFullSync,
  bacnetIncrementalSync,
  createAwsIotClient,
  createAzureIotClient,
  createBacnetClient,
  createMqttConnectorClient,
  createNodeRedClient,
  createOpcUaClient,
  createSamsaraClient,
  createSmartThingsClient,
  createThingsboardClient,
  createVerkadaClient,
  mqttFullSync,
  mqttIncrementalSync,
  nodeRedFullSync,
  nodeRedIncrementalSync,
  opcUaFullSync,
  opcUaIncrementalSync,
  samsaraFullSync,
  samsaraIncrementalSync,
  smartThingsFullSync,
  smartThingsIncrementalSync,
  thingsboardFullSync,
  thingsboardIncrementalSync,
  verkadaFullSync,
  verkadaIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerIotIndustrialFactories(): void {
  registerSyncFactory(
    "SAMSARA",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiToken = config?.api_token as string | undefined;
      if (!apiToken) {
        throw ApplicationFailure.nonRetryable(
          `No API token for Samsara connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region = ((config?.region as string) ?? "us") as "us" | "eu";
      const apiVersion = (config?.api_version as string) ?? "2024-06-01";
      const syncAlerts = config?.sync_alerts !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        { connectorId, region, syncAlerts, lookbackDays },
        "Samsara sync config loaded"
      );

      const client = createSamsaraClient({
        connectorId,
        apiToken,
        region,
        apiVersion,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationId: (config?.organization_id as string) ?? undefined,
        organizationName: (config?.organization_name as string) ?? undefined,
        region,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? samsaraFullSync(client, context, {
            batchSize: 100,
            syncAlerts,
            lookbackDays,
          })
        : samsaraIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
          });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "VERKADA",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for Verkada connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region = ((config?.region as string) ?? "us") as "us" | "eu" | "au";
      const syncCameras = config?.sync_cameras !== false;
      const syncDoors = config?.sync_doors !== false;
      const syncSensors = config?.sync_sensors !== false;

      logger.info(
        { connectorId, region, syncCameras, syncDoors, syncSensors },
        "Verkada sync config loaded"
      );

      const client = createVerkadaClient({
        connectorId,
        apiKey,
        region,
      });

      const context = {
        connectorId: connector.id,
        connectorType: "VERKADA" as const,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationId: (config?.organization_id as string) ?? "",
        organizationName: (config?.organization_name as string) ?? "",
        region,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? verkadaFullSync(client, context, {
            pageSize: 100,
            syncCameras,
            syncDoors,
            syncSensors,
          })
        : verkadaIncrementalSync(client, context, { pageSize: 100 });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "AWS_IOT",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const accessKeyId = config?.access_key_id as string | undefined;
      const secretAccessKey = config?.secret_access_key as string | undefined;
      if (!(accessKeyId && secretAccessKey)) {
        throw ApplicationFailure.nonRetryable(
          `No AWS credentials for AWS IoT Core connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region = ((config?.region as string) ?? "us-east-1") as
        | "us-east-1"
        | "us-east-2"
        | "us-west-1"
        | "us-west-2"
        | "eu-west-1"
        | "eu-west-2"
        | "eu-central-1"
        | "ap-northeast-1"
        | "ap-southeast-1"
        | "ap-southeast-2";
      const syncThingGroups = config?.sync_thing_groups !== false;
      const syncShadows = config?.sync_shadows !== false;

      logger.info(
        { connectorId, region, syncThingGroups, syncShadows },
        "AWS IoT Core sync config loaded"
      );

      const client = createAwsIotClient({
        connectorId,
        accessKeyId,
        secretAccessKey,
        region,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        region,
        accountId: (config?.account_id as string) ?? undefined,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? awsIotFullSync(client, context, {
            pageSize: 250,
            syncThingGroups,
            syncShadows,
          })
        : awsIotIncrementalSync(client, context, {
            pageSize: 250,
            syncShadows,
          });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "AZURE_IOT",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const connectionString = config?.connection_string as string | undefined;
      if (!connectionString) {
        throw ApplicationFailure.nonRetryable(
          `No connection string for Azure IoT Hub connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      logger.info({ connectorId }, "Azure IoT Hub sync config loaded");

      const client = createAzureIotClient({
        connectorId,
        connectionString,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        hubName: client.hubName,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? azureIotFullSync(client, context, {
            pageSize: 100,
          })
        : azureIotIncrementalSync(client, context, {
            pageSize: 100,
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
          });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "SMARTTHINGS",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const accessToken = config?.access_token as string | undefined;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for SmartThings connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncScenes = config?.sync_scenes !== false;

      logger.info(
        { connectorId, syncScenes },
        "SmartThings sync config loaded"
      );

      const client = createSmartThingsClient({
        connectorId,
        accessToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? smartThingsFullSync(client, context, {
            pageSize: 200,
            syncScenes,
          })
        : smartThingsIncrementalSync(client, context, {
            pageSize: 200,
            syncScenes,
          });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "MQTT",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const brokerUrl = config?.broker_url as string | undefined;
      if (!brokerUrl) {
        throw ApplicationFailure.nonRetryable(
          `No broker URL for MQTT connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      const port = parseNumericConfig(config?.port, 8883) ?? 8883;
      const protocol = ((config?.protocol as string) ?? "mqtts") as
        | "mqtt"
        | "mqtts"
        | "ws"
        | "wss";
      const username = (config?.username as string) ?? undefined;
      const password = (config?.password as string) ?? undefined;
      const clientId =
        (config?.client_id as string) ?? `openbeam_${connectorId}`;

      logger.info(
        { connectorId, brokerUrl, port, protocol },
        "MQTT sync config loaded"
      );

      const client = createMqttConnectorClient({
        connection: {
          connectorId,
          brokerUrl,
          protocol,
          port,
          clientId,
          username,
          password,
          mqttVersion: ((config?.mqtt_version as string) ?? "5.0") as
            | "3.1.1"
            | "5.0",
          cleanStart: config?.clean_start !== false,
          sessionExpiryInterval:
            parseNumericConfig(config?.session_expiry_interval, 3600) ?? 3600,
          keepAlive: parseNumericConfig(config?.keep_alive, 60) ?? 60,
          reconnectPeriod:
            parseNumericConfig(config?.reconnect_period, 5000) ?? 5000,
          connectTimeout:
            parseNumericConfig(config?.connect_timeout, 30_000) ?? 30_000,
        },
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        brokerUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? mqttFullSync(client, context, { batchSize: 100 })
        : mqttIncrementalSync(client, context, { batchSize: 100 });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "OPCUA",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const endpointUrl = config?.endpoint_url as string | undefined;
      if (!endpointUrl) {
        throw ApplicationFailure.nonRetryable(
          `No endpoint URL for OPC-UA connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, endpointUrl }, "OPC-UA sync config loaded");

      const client = createOpcUaClient({
        connectorId,
        endpointUrl,
        applicationName:
          (config?.application_name as string) ?? "OpenBeam Gateway",
        keepAliveInterval:
          parseNumericConfig(config?.keep_alive_interval, 10_000) ?? 10_000,
        connectionTimeout:
          parseNumericConfig(config?.connection_timeout, 30_000) ?? 30_000,
        requestTimeout:
          parseNumericConfig(config?.request_timeout, 60_000) ?? 60_000,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        endpointUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? opcUaFullSync(client, context, { batchSize: 100 })
        : opcUaIncrementalSync(client, context, { batchSize: 100 });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "BACNET",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const networkInterface =
        (config?.interface as string) ??
        (config?.network_interface as string) ??
        "0.0.0.0";
      const port = parseNumericConfig(config?.port, 47_808) ?? 47_808;
      const broadcastAddress =
        (config?.broadcast_address as string) ?? "255.255.255.255";

      logger.info(
        { connectorId, networkInterface, port, broadcastAddress },
        "BACnet sync config loaded"
      );

      const client = createBacnetClient({
        connectorId,
        interface: networkInterface,
        port,
        broadcastAddress,
        discoveryTimeout:
          parseNumericConfig(config?.discovery_timeout, 5000) ?? 5000,
        readTimeout: parseNumericConfig(config?.read_timeout, 3000) ?? 3000,
        covLifetime: parseNumericConfig(config?.cov_lifetime, 300) ?? 300,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        networkInterface,
        siteName: (config?.site_name as string) ?? undefined,
        buildingName: (config?.building_name as string) ?? undefined,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? bacnetFullSync(client, context, { batchSize: 100 })
        : bacnetIncrementalSync(client, context);

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "THINGSBOARD",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const baseUrl = config?.base_url as string | undefined;
      const username = config?.username as string | undefined;
      const password = config?.password as string | undefined;
      if (!(baseUrl && username && password)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials for ThingsBoard connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncAlarms = config?.sync_alarms !== false;
      const syncDashboards = config?.sync_dashboards !== false;

      logger.info(
        { connectorId, baseUrl, syncAlarms, syncDashboards },
        "ThingsBoard sync config loaded"
      );

      const client = createThingsboardClient({
        connectorId,
        baseUrl,
        username,
        password,
        timeout: parseNumericConfig(config?.timeout, 30_000) ?? 30_000,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        baseUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? thingsboardFullSync(client, context, {
            pageSize: 100,
            syncAlarms,
            syncDashboards,
          })
        : thingsboardIncrementalSync(client, context, {
            pageSize: 100,
            syncAlarms,
            syncDashboards,
          });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );

  registerSyncFactory(
    "NODERED",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const baseUrl = config?.base_url as string | undefined;
      const accessToken = config?.access_token as string | undefined;
      if (!(baseUrl && accessToken)) {
        throw ApplicationFailure.nonRetryable(
          `Missing credentials for Node-RED connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncNodes = config?.sync_nodes !== false;

      logger.info(
        { connectorId, baseUrl, syncNodes },
        "Node-RED sync config loaded"
      );

      const client = createNodeRedClient({
        connectorId,
        baseUrl,
        accessToken,
        timeout: parseNumericConfig(config?.timeout, 30_000) ?? 30_000,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        baseUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? nodeRedFullSync(client, context, { syncNodes })
        : nodeRedIncrementalSync(client, context, { syncNodes });

      for await (const batch of syncGenerator) {
        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
        };
      }
    }
  );
}
