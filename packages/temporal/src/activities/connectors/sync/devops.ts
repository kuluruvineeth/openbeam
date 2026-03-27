import {
  azureDevOpsFullSync,
  azureDevOpsIncrementalSync,
  bitbucketFullSync,
  bitbucketIncrementalSync,
  createAzureDevOpsClient,
  createBitbucketClient,
  createDatadogClient,
  createJenkinsClient,
  createJFrogClient,
  createOpsGenieClient,
  createPagerDutyClient,
  createPhabricatorClient,
  datadogFullSync,
  datadogIncrementalSync,
  jenkinsFullSync,
  jenkinsIncrementalSync,
  jfrogFullSync,
  jfrogIncrementalSync,
  opsgenieFullSync,
  opsgenieIncrementalSync,
  pagerdutyFullSync,
  pagerdutyIncrementalSync,
  phabricatorFullSync,
  phabricatorIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { JenkinsSyncCursor } from "@openbeam/types/services/connectors/jenkins";
import type { JFrogSyncCursor } from "@openbeam/types/services/connectors/jfrog";
import type { PhabricatorSyncCursor } from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import {
  parseBooleanConfig,
  parseNumericConfig,
  shouldRunFullSync,
} from "./helpers";

export function registerDevOpsFactories(): void {
  registerSyncFactory(
    "AZURE_DEVOPS",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Azure DevOps connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const organization = config?.organization as string;
      if (!organization) {
        throw ApplicationFailure.nonRetryable(
          "Azure DevOps organization not configured",
          "ConfigurationError"
        );
      }

      const client = createAzureDevOpsClient({
        connectorId,
        accessToken,
        organization,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        organization,
        baseUrl: `https://dev.azure.com/${organization}`,
      };

      const includeProjects = config?.include_projects
        ? String(config.include_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const excludeProjects = config?.exclude_projects
        ? String(config.exclude_projects)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : undefined;
      const workItemTypes = config?.work_item_types
        ? String(config.work_item_types)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      const syncRepos = parseBooleanConfig(config?.sync_repos) ?? true;
      const syncPullRequests =
        parseBooleanConfig(config?.sync_pull_requests) ?? true;
      const syncWiki = parseBooleanConfig(config?.sync_wiki) ?? false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? azureDevOpsFullSync(client, context, {
            batchSize: 100,
            includeProjects,
            excludeProjects,
            syncRepos,
            syncPullRequests,
            syncWiki,
            workItemTypes,
            lookbackDays,
          })
        : azureDevOpsIncrementalSync(client, context, {
            cursor: cursor as Record<string, unknown> | undefined,
            batchSize: 100,
            includeProjects,
            excludeProjects,
            syncRepos,
            syncPullRequests,
            syncWiki,
            workItemTypes,
            lookbackDays,
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
    "BITBUCKET",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Bitbucket connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const workspace = (config?.workspace as string) ?? "";
      if (!workspace) {
        throw ApplicationFailure.nonRetryable(
          `No workspace configured for Bitbucket connector ${connectorId}`,
          "ConfigurationError"
        );
      }

      const syncPullRequests = config?.sync_pull_requests !== false;
      const syncIssues = config?.sync_issues !== false;
      const syncSnippets = config?.sync_snippets === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        {
          connectorId,
          workspace,
          syncPullRequests,
          syncIssues,
          syncSnippets,
          lookbackDays,
          hasExistingCursor: !!cursor?.lastSyncTime,
        },
        "Bitbucket sync config loaded"
      );

      const client = createBitbucketClient({
        connectorId,
        accessToken,
        workspace,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        workspaceSlug: workspace,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? bitbucketFullSync(client, context, {
            batchSize: 100,
            syncPullRequests,
            syncIssues,
            syncSnippets,
            lookbackDays,
          })
        : bitbucketIncrementalSync(client, context, {
            lastSyncTime: (cursor?.lastSyncTime as number) ?? Date.now(),
            batchSize: 100,
            syncPullRequests,
            syncIssues,
            syncSnippets,
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
    "DATADOG",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      const appKey = config?.app_key as string | undefined;
      if (!(apiKey && appKey)) {
        throw ApplicationFailure.nonRetryable(
          `Missing API key or Application key for Datadog connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const siteRaw = (config?.site as string) ?? "us1";
      const validSites = ["us1", "us3", "us5", "eu", "ap1", "gov"] as const;
      const site = validSites.includes(siteRaw as (typeof validSites)[number])
        ? (siteRaw as (typeof validSites)[number])
        : ("us1" as const);
      const syncDashboards =
        parseBooleanConfig(config?.sync_dashboards) !== false;
      const syncIncidents =
        parseBooleanConfig(config?.sync_incidents) !== false;
      const syncServices = parseBooleanConfig(config?.sync_services) !== false;
      const syncNotebooks =
        parseBooleanConfig(config?.sync_notebooks) !== false;
      const syncSlos = parseBooleanConfig(config?.sync_slos) !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);

      const client = createDatadogClient({
        connectorId,
        apiKey,
        appKey,
        site,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        site,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? datadogFullSync(client, context, {
            syncDashboards,
            syncIncidents,
            syncServices,
            syncNotebooks,
            syncSlos,
            lookbackDays,
          })
        : datadogIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastMonitorModified?: number;
              lastDashboardModified?: number;
            },
            syncDashboards,
            syncIncidents,
            syncServices,
            syncNotebooks,
            syncSlos,
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
    "OPSGENIE",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for OpsGenie connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const region =
        (config?.region as string) === "eu" ? ("eu" as const) : ("us" as const);
      const syncServices = parseBooleanConfig(config?.sync_services) !== false;
      const syncSchedules =
        parseBooleanConfig(config?.sync_schedules) !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);

      const client = createOpsGenieClient({ connectorId, apiKey, region });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        region,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? opsgenieFullSync(client, context, {
            syncServices,
            syncSchedules,
            lookbackDays,
          })
        : opsgenieIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastAlertUpdatedAt?: string;
              lastIncidentUpdatedAt?: string;
            },
            syncServices,
            syncSchedules,
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
    "PAGERDUTY",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      if (!apiKey) {
        throw ApplicationFailure.nonRetryable(
          `No API key for PagerDuty connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncServices = config?.sync_services !== false;
      const syncSchedules = config?.sync_schedules !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);
      const urgencyFilter = (config?.urgency_filter as string) ?? undefined;
      const statusFilter = (config?.status_filter as string) ?? undefined;
      const serviceIdsRaw = (config?.service_ids_filter as string) ?? "";
      const serviceIdsFilter = serviceIdsRaw
        ? serviceIdsRaw
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        { connectorId, syncServices, syncSchedules, lookbackDays },
        "PagerDuty sync config loaded"
      );

      const client = createPagerDutyClient({
        connectorId,
        apiKey,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? pagerdutyFullSync(client, context, {
            batchSize: 100,
            syncServices,
            syncSchedules,
            lookbackDays,
            urgencyFilter,
            statusFilter,
            serviceIdsFilter,
          })
        : pagerdutyIncrementalSync(client, context, {
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
    "JENKINS",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiToken = (config?.apiToken as string) ?? "";
      const instanceUrl = (config?.instanceUrl as string) ?? "";
      const username = (config?.username as string) ?? "";
      if (!apiToken) {
        throw ApplicationFailure.nonRetryable(
          `No API token for Jenkins connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!instanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Jenkins instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createJenkinsClient({
        connectorId,
        instanceUrl,
        username,
        apiToken,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? jenkinsFullSync(client, context, { batchSize: 100 })
        : jenkinsIncrementalSync(client, context, {
            cursor: cursor as JenkinsSyncCursor | undefined,
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
    "JFROG",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for JFrog connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const jfrogConfig = connector.config as Record<string, unknown> | null;
      const jfrogInstanceUrl = (jfrogConfig?.instanceUrl as string) ?? "";
      if (!jfrogInstanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "JFrog instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createJFrogClient({
        connectorId,
        accessToken,
        instanceUrl: jfrogInstanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: jfrogInstanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? jfrogFullSync(client, context, { batchSize: 100 })
        : jfrogIncrementalSync(client, context, {
            cursor: cursor as JFrogSyncCursor | undefined,
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
    "PHABRICATOR",
    async function* (connectorId, connector, cursor, syncType) {
      const phabConfig = connector.config as Record<string, unknown> | null;
      const apiToken = (phabConfig?.apiToken as string) ?? "";
      const phabInstanceUrl = (phabConfig?.instanceUrl as string) ?? "";
      if (!apiToken) {
        throw ApplicationFailure.nonRetryable(
          `No API token for Phabricator connector ${connectorId}`,
          "AuthorizationError"
        );
      }
      if (!phabInstanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Phabricator instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createPhabricatorClient({
        connectorId,
        apiToken,
        instanceUrl: phabInstanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: phabInstanceUrl,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? phabricatorFullSync(client, context, { batchSize: 100 })
        : phabricatorIncrementalSync(client, context, {
            cursor: cursor as PhabricatorSyncCursor | undefined,
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
}
