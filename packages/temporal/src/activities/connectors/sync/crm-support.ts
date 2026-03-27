import {
  createFreshserviceClient,
  createHubSpotClient,
  createIntercomClient,
  createNiceCxoneClient,
  createPipedriveClient,
  createSalesforceClient,
  createServiceNowClient,
  createZendeskClient,
  freshserviceFullSync,
  freshserviceIncrementalSync,
  getValidAccessToken,
  hubspotFullSync,
  hubspotIncrementalSync,
  intercomFullSync,
  intercomIncrementalSync,
  niceCxoneFullSync,
  niceCxoneIncrementalSync,
  pipedriveFullSync,
  pipedriveIncrementalSync,
  salesforceFullSync,
  salesforceIncrementalSync,
  servicenowFullSync,
  servicenowIncrementalSync,
  zendeskFullSync,
  zendeskIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerCrmSupportFactories(): void {
  registerSyncFactory(
    "SALESFORCE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const instanceUrl = (config?.instanceUrl as string) ?? "";
      const syncCases = config?.sync_cases !== false;
      const syncLeads = config?.sync_leads !== false;
      const syncCampaigns = config?.sync_campaigns === true;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;

      if (!instanceUrl) {
        throw ApplicationFailure.nonRetryable(
          "Salesforce instanceUrl not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        { connectorId, instanceUrl },
        "Salesforce sync config loaded"
      );

      const client = createSalesforceClient({
        connectorId,
        accessToken,
        instanceUrl,
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
        ? salesforceFullSync(client, context, {
            batchSize: 200,
            syncCases,
            syncLeads,
            syncCampaigns,
            lookbackDays,
          })
        : salesforceIncrementalSync(client, context, {
            cursor,
            batchSize: 200,
            syncCases,
            syncLeads,
            syncCampaigns,
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
    "HUBSPOT",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const portalId = (config?.portalId as string) ?? "";
      const syncContacts = config?.sync_contacts !== false;
      const syncCompanies = config?.sync_companies !== false;
      const syncDeals = config?.sync_deals !== false;
      const syncTickets = config?.sync_tickets !== false;
      const extraProperties =
        (config?.custom_properties as string)
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];

      if (!portalId) {
        throw ApplicationFailure.nonRetryable(
          "HubSpot portalId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, portalId }, "HubSpot sync config loaded");

      const client = createHubSpotClient({
        connectorId,
        accessToken,
        portalId,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        portalId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? hubspotFullSync(client, context, {
            batchSize: 100,
            syncContacts,
            syncCompanies,
            syncDeals,
            syncTickets,
            extraProperties,
          })
        : hubspotIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            syncContacts,
            syncCompanies,
            syncDeals,
            syncTickets,
            extraProperties,
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
    "ZENDESK",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const subdomain = (config?.subdomain as string) ?? "";
      const syncComments = config?.sync_comments === true;
      const syncArticles = config?.sync_articles !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const excludeClosedDays = parseNumericConfig(config?.exclude_closed_days);
      const tagsFilter = config?.tags_filter
        ? String(config.tags_filter)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      if (!subdomain) {
        throw ApplicationFailure.nonRetryable(
          "Zendesk subdomain not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        {
          connectorId,
          subdomain,
          syncComments,
          syncArticles,
          lookbackDays,
          excludeClosedDays,
          tagsFilter,
        },
        "Zendesk sync config loaded"
      );

      const client = createZendeskClient({
        connectorId,
        accessToken,
        subdomain,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        subdomain,
      };

      const syncOptions = {
        batchSize: 100,
        syncComments,
        syncArticles,
        lookbackDays,
        tagsFilter,
        excludeClosedDays,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? zendeskFullSync(client, context, syncOptions)
        : zendeskIncrementalSync(client, context, {
            ...syncOptions,
            cursor,
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
    "INTERCOM",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const syncConversations = config?.sync_conversations !== false;
      const syncArticles = config?.sync_articles !== false;
      const syncCollections = config?.sync_collections !== false;
      const syncContacts = config?.sync_contacts === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const stateFilter = (config?.state_filter as string) || undefined;
      const tagsFilter = config?.tags_filter
        ? String(config.tags_filter)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      logger.info(
        {
          connectorId,
          syncConversations,
          syncArticles,
          syncCollections,
          syncContacts,
          lookbackDays,
          stateFilter,
          tagsFilter,
        },
        "Intercom sync config loaded"
      );

      const client = createIntercomClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        appId: (config?.appId as string) ?? undefined,
      };

      const syncOptions = {
        batchSize: 50,
        syncConversations,
        syncArticles,
        syncCollections,
        syncContacts,
        lookbackDays,
        stateFilter,
        tagsFilter,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? intercomFullSync(client, context, syncOptions)
        : intercomIncrementalSync(client, context, {
            ...syncOptions,
            cursor,
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
    "SERVICENOW",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const instance = (config?.instance as string) ?? "";

      if (!instance) {
        throw ApplicationFailure.nonRetryable(
          "ServiceNow instance name not found in connector config",
          "ConfigurationError"
        );
      }

      const syncKnowledge = (config?.sync_knowledge as boolean) ?? true;
      const syncChanges = (config?.sync_changes as boolean) ?? true;
      const lookbackDays = (config?.lookback_days as string) ?? "";
      const categoryFilter = (config?.category_filter as string) ?? "";
      const assignmentGroupFilter =
        (config?.assignment_group_filter as string) ?? "";

      logger.info(
        {
          connectorId,
          instance,
          syncKnowledge,
          syncChanges,
          lookbackDays,
          categoryFilter,
          assignmentGroupFilter,
        },
        "ServiceNow sync config loaded"
      );

      const client = createServiceNowClient({
        connectorId,
        accessToken,
        instance,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instance,
      };

      const syncOptions = {
        batchSize: 100,
        syncKnowledge,
        syncChanges,
        lookbackDays: lookbackDays ? Number(lookbackDays) : undefined,
        categoryFilter: categoryFilter
          ? categoryFilter.split(",").map((s: string) => s.trim())
          : undefined,
        assignmentGroupFilter: assignmentGroupFilter
          ? assignmentGroupFilter.split(",").map((s: string) => s.trim())
          : undefined,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? servicenowFullSync(client, context, syncOptions)
        : servicenowIncrementalSync(client, context, {
            ...syncOptions,
            cursor,
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
    "FRESHSERVICE",
    async function* (connectorId, connector, cursor, syncType) {
      const config = connector.config as Record<string, unknown> | null;
      const apiKey = config?.api_key as string | undefined;
      const domain = config?.domain as string | undefined;
      if (!(apiKey && domain)) {
        throw ApplicationFailure.nonRetryable(
          `No API key or domain for Freshservice connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const syncArticles = config?.sync_articles !== false;
      const syncChanges = config?.sync_changes === true;
      const syncProblems = config?.sync_problems === true;
      const lookbackDays = parseNumericConfig(config?.lookback_days, 90);

      logger.info(
        { connectorId, syncArticles, syncChanges, syncProblems, lookbackDays },
        "Freshservice sync config loaded"
      );

      const client = createFreshserviceClient({
        connectorId,
        apiKey,
        domain,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        domain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? freshserviceFullSync(client, context, {
            batchSize: 100,
            syncArticles,
            syncChanges,
            syncProblems,
            lookbackDays,
          })
        : freshserviceIncrementalSync(client, context, {
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
    "PIPEDRIVE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const companyDomain = (config?.companyDomain as string) ?? "";
      const syncActivities = config?.sync_activities !== false;
      const syncNotes = config?.sync_notes !== false;
      const syncOrganizations = config?.sync_organizations !== false;
      const pipelineFilterStr = (config?.pipeline_filter as string) ?? "";
      const pipelineFilter = pipelineFilterStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      if (!companyDomain) {
        throw ApplicationFailure.nonRetryable(
          "Pipedrive companyDomain not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        { connectorId, companyDomain },
        "Pipedrive sync config loaded"
      );

      const client = createPipedriveClient({
        connectorId,
        accessToken,
        companyDomain,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        companyDomain,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? pipedriveFullSync(client, context, {
            batchSize: 100,
            syncActivities,
            syncNotes,
            syncOrganizations,
            pipelineFilter,
          })
        : pipedriveIncrementalSync(client, context, {
            cursor: cursor as {
              lastSyncTime?: number;
              lastFullSync?: number;
            },
            batchSize: 100,
            syncActivities,
            syncNotes,
            syncOrganizations,
            pipelineFilter,
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
    "NICE_CXONE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No credentials for connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const baseUrl = (config?.baseUrl as string) ?? "";
      if (!baseUrl) {
        throw ApplicationFailure.nonRetryable(
          "NiceCxone baseUrl not found in connector config",
          "ConfigurationError"
        );
      }

      const client = createNiceCxoneClient({
        connectorId,
        accessToken,
        baseUrl,
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
        ? niceCxoneFullSync(client, context, { batchSize: 100 })
        : niceCxoneIncrementalSync(client, context, {
            cursor: cursor as
              | { lastSyncTime?: number; forceFullSync?: boolean }
              | undefined,
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
