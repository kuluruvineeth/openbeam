import {
  asanaFullSync,
  asanaIncrementalSync,
  confluenceFullSync,
  confluenceIncrementalSync,
  createAsanaClient,
  createAtlassianClient,
  createGitHubClient,
  createGitLabClient,
  createLinearClient,
  createNotionClient,
  createSlackClient,
  getValidAccessToken,
  githubFullSync,
  githubIncrementalSync,
  gitlabFullSync,
  gitlabIncrementalSync,
  jiraFullSync,
  jiraIncrementalSync,
  linearFullSync,
  linearIncrementalSync,
  notionFullSync,
  notionIncrementalSync,
  incrementalSync as slackIncrementalSync,
} from "@openbeam/services";
import { logger } from "@openbeam/services/lib/logger";
import type { GenericDocument } from "@openbeam/vespa";
import { ApplicationFailure } from "@temporalio/common";
import type { SyncCursor } from "../../../workflows/types";
import type { DiscoveredResourceRecord } from "../types";
import { registerSyncFactory } from "../unified-fetch-batch";
import { parseNumericConfig, shouldRunFullSync } from "./helpers";

export function registerEnterpriseSaasFactories(): void {
  registerSyncFactory(
    "LINEAR",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Linear connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createLinearClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];
      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? linearFullSync(client, context, {
            batchSize: 100,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onTeamsDiscovered: async (teams) => {
              for (const team of teams) {
                pendingResources.push({
                  externalId: team.id,
                  resourceType: "team",
                  name: team.name,
                  isPublic: true,
                  metadata: {},
                });
              }
            },
          })
        : linearIncrementalSync(client, context, {
            lastSyncTime:
              parseNumericConfig(cursor?.lastSyncTime) ?? Date.now(),
            batchSize: 100,
          });

      for await (const batch of syncGenerator) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "SLACK",
    async function* (connectorId, connector, cursor, syncType) {
      const token = await getValidAccessToken(connectorId);
      const client = createSlackClient({ token, connectorId });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const config = connector.config as Record<string, unknown> | null;
      const indexDms = config?.index_dms === true;
      const indexGroupDms =
        config?.index_group_dms === true ||
        config?.federated_include_group_dms === true;
      const syncFiles = config?.sync_files !== false;
      const syncCanvases = config?.index_canvases !== false;
      const syncClips = config?.index_clips !== false;
      const syncBookmarks = config?.index_bookmarks !== false;

      const disabledChannelIds = connector.disabledResourceIds
        ? new Set(connector.disabledResourceIds)
        : undefined;

      logger.info(
        {
          connectorId,
          indexDms,
          indexGroupDms,
          syncFiles,
          syncCanvases,
          syncClips,
          syncBookmarks,
          disabledChannelCount: disabledChannelIds?.size ?? 0,
          rawConfig: config,
        },
        "Slack sync config loaded"
      );

      const pendingResources: DiscoveredResourceRecord[] = [];

      for await (const batch of slackIncrementalSync(client, context, {
        cursor,
        forceFullSync: shouldRunFullSync(syncType, cursor),
        channelOptions: {
          indexDms,
          indexGroupDms,
        },
        disabledChannelIds,
        syncFiles,
        syncCanvases,
        syncClips,
        syncBookmarks,
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onChannelsDiscovered: async (channels) => {
          for (const channel of channels) {
            pendingResources.push({
              externalId: channel.id,
              resourceType: channel.is_private ? "private_channel" : "channel",
              name: channel.name,
              isPublic: !channel.is_private,
              metadata: {
                isArchived: channel.is_archived,
                isGeneral: channel.is_general,
                isShared: channel.is_shared,
                creator: channel.creator,
                numMembers: channel.num_members,
                created: channel.created,
              },
            });
          }
        },
        // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
        onFilesDiscovered: async (files) => {
          for (const file of files) {
            const downloadUrl =
              file.downloadStrategy.type === "url"
                ? file.downloadStrategy.downloadUrl
                : undefined;

            const resourceType = file.mimeType.startsWith("video/")
              ? "video"
              : "file";
            const finalResourceType = file.mimeType.startsWith("audio/")
              ? "audio"
              : resourceType;

            pendingResources.push({
              externalId: file.id,
              resourceType: finalResourceType,
              name: file.name,
              metadata: {
                mimeType: file.mimeType,
                size: file.size,
                downloadUrl,
                permalink: file.permalink,
                createdAt: file.createdAt,
                userId: file.userId,
                userName: file.userName,
                sourceChannelId: file.sourceChannelId,
              },
            });
          }
        },
      })) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "NOTION",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for Notion connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const client = createNotionClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
      };

      const config = connector.config as Record<string, unknown> | null;
      const extractContent = config?.extract_content !== false;
      const extractComments = config?.extract_comments !== false;
      const maxBlockDepth = parseNumericConfig(config?.max_block_depth, 10);
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        {
          connectorId,
          extractContent,
          extractComments,
          maxBlockDepth,
          lookbackDays,
          rawConfig: config,
        },
        "Notion sync config loaded"
      );

      const pendingResources: DiscoveredResourceRecord[] = [];
      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? notionFullSync(client, context, {
            batchSize: 5,
            cursor,
            extractContent,
            extractComments,
            maxBlockDepth,
            lookbackDays,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onDatabasesDiscovered: async (databases) => {
              for (const db of databases) {
                pendingResources.push({
                  externalId: db.id,
                  resourceType: "database",
                  name: db.title?.[0]?.plain_text ?? "Untitled Database",
                  isPublic: !db.archived,
                  metadata: {
                    url: db.url,
                    createdTime: db.created_time,
                    lastEditedTime: db.last_edited_time,
                  },
                });
              }
            },
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onPagesDiscovered: async (pages) => {
              for (const page of pages) {
                const titleProp = Object.values(page.properties).find(
                  (p) => (p as { type: string }).type === "title"
                ) as { title?: Array<{ plain_text: string }> } | undefined;
                const title =
                  titleProp?.title?.[0]?.plain_text ?? "Untitled Page";

                pendingResources.push({
                  externalId: page.id,
                  resourceType: "page",
                  name: title,
                  isPublic: !(page.archived || page.in_trash),
                  metadata: {
                    url: page.url,
                    createdTime: page.created_time,
                    lastEditedTime: page.last_edited_time,
                    parentType: page.parent.type,
                  },
                });
              }
            },
          })
        : notionIncrementalSync(client, context, {
            batchSize: 5,
            cursor,
            extractContent,
            extractComments,
            maxBlockDepth,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onDatabasesDiscovered: async (databases) => {
              for (const db of databases) {
                pendingResources.push({
                  externalId: db.id,
                  resourceType: "database",
                  name: db.title?.[0]?.plain_text ?? "Untitled Database",
                  isPublic: !db.archived,
                  metadata: {
                    url: db.url,
                    createdTime: db.created_time,
                    lastEditedTime: db.last_edited_time,
                  },
                });
              }
            },
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onPagesDiscovered: async (pages) => {
              for (const page of pages) {
                const titleProp = Object.values(page.properties).find(
                  (p) => (p as { type: string }).type === "title"
                ) as { title?: Array<{ plain_text: string }> } | undefined;
                const title =
                  titleProp?.title?.[0]?.plain_text ?? "Untitled Page";

                pendingResources.push({
                  externalId: page.id,
                  resourceType: "page",
                  name: title,
                  isPublic: !(page.archived || page.in_trash),
                  metadata: {
                    url: page.url,
                    createdTime: page.created_time,
                    lastEditedTime: page.last_edited_time,
                    parentType: page.parent.type,
                  },
                });
              }
            },
          });

      for await (const batch of syncGenerator) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "JIRA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const cloudId = (config?.cloudId as string) ?? "";
      const siteUrl = (config?.siteUrl as string) ?? "";
      const syncComments = config?.sync_comments !== false;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;
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
      const issueTypes = config?.issue_types
        ? String(config.issue_types)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;
      const statusFilter = config?.status_filter
        ? String(config.status_filter)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      if (!cloudId) {
        throw ApplicationFailure.nonRetryable(
          "Jira cloudId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, cloudId, siteUrl }, "Jira sync config loaded");

      const client = createAtlassianClient({
        connectorId,
        accessToken,
        cloudId,
        product: "jira",
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        siteUrl,
        cloudId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? jiraFullSync(client, context, {
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            lookbackDays,
            issueTypes,
            statusFilter,
          })
        : jiraIncrementalSync(client, context, {
            cursor,
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            lookbackDays,
            issueTypes,
            statusFilter,
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
    "CONFLUENCE",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const cloudId = (config?.cloudId as string) ?? "";
      const siteUrl = (config?.siteUrl as string) ?? "";
      const includeSpaces = config?.include_spaces
        ? String(config.include_spaces)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const excludeSpaces = config?.exclude_spaces
        ? String(config.exclude_spaces)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const syncComments = config?.sync_comments !== false;
      const labelsFilter = config?.labels_filter
        ? String(config.labels_filter)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const syncArchived = config?.sync_archived === true;

      if (!cloudId) {
        throw ApplicationFailure.nonRetryable(
          "Confluence cloudId not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info(
        { connectorId, cloudId, siteUrl, syncComments, syncArchived },
        "Confluence sync config loaded"
      );

      const client = createAtlassianClient({
        connectorId,
        accessToken,
        cloudId,
        product: "confluence",
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        siteUrl,
        cloudId,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? confluenceFullSync(client, context, {
            batchSize: 100,
            includeSpaces,
            excludeSpaces,
            syncComments,
            labelsFilter,
            syncArchived,
          })
        : confluenceIncrementalSync(client, context, {
            cursor,
            batchSize: 100,
            includeSpaces,
            excludeSpaces,
            syncComments,
            labelsFilter,
            syncArchived,
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
    "GITHUB",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for GitHub connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const organizationName =
        (config?.organizationName as string) ??
        (config?.organization_name as string) ??
        "";
      const syncPRs = config?.sync_prs !== false;
      const syncDiscussions = config?.sync_discussions === true;
      const syncCommits = config?.sync_commits === true;
      const syncComments = config?.sync_comments !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);

      logger.info(
        {
          connectorId,
          organizationName,
          syncPRs,
          syncDiscussions,
          syncCommits,
          syncComments,
          lookbackDays,
          hasExistingCursor: !!cursor?.lastSyncTime,
          rawConfig: config,
        },
        "GitHub sync config loaded"
      );

      const client = createGitHubClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId,
        organizationName,
      };

      const pendingResources: DiscoveredResourceRecord[] = [];

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? githubFullSync(client, context, {
            batchSize: 100,
            syncPRs,
            syncDiscussions,
            syncCommits,
            syncComments,
            lookbackDays,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onReposDiscovered: async (repos) => {
              for (const repo of repos) {
                pendingResources.push({
                  externalId: String(repo.id),
                  resourceType: "repository",
                  name: repo.full_name,
                  isPublic: !repo.private,
                  metadata: {
                    description: repo.description,
                    language: repo.language,
                    stargazersCount: repo.stargazers_count,
                  },
                });
              }
            },
          })
        : githubIncrementalSync(client, context, {
            lastSyncTime: (cursor?.lastSyncTime as number) ?? Date.now(),
            batchSize: 100,
            syncPRs,
            syncDiscussions,
            syncCommits,
            syncComments,
          });

      for await (const batch of syncGenerator) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "GITLAB",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = connector.oauthProvider?.accessToken;
      if (!accessToken) {
        throw ApplicationFailure.nonRetryable(
          `No access token for GitLab connector ${connectorId}`,
          "AuthorizationError"
        );
      }

      const config = connector.config as Record<string, unknown> | null;
      const instanceUrl = (config?.instance_url as string) || undefined;
      const syncMergeRequests = config?.sync_merge_requests !== false;
      const syncComments = config?.sync_comments !== false;
      const lookbackDays = parseNumericConfig(config?.lookback_days);
      const visibilityFilter =
        (config?.visibility_filter as string) || undefined;

      const includeGroupsRaw = (config?.include_groups as string) || "";
      const excludeGroupsRaw = (config?.exclude_groups as string) || "";
      const includeGroups = includeGroupsRaw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      const excludeGroups = excludeGroupsRaw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      logger.info(
        {
          connectorId,
          instanceUrl,
          syncMergeRequests,
          syncComments,
          lookbackDays,
          hasExistingCursor: !!cursor?.lastSyncTime,
        },
        "GitLab sync config loaded"
      );

      const client = createGitLabClient({
        connectorId,
        accessToken,
        instanceUrl,
      });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        instanceUrl: instanceUrl ?? "https://gitlab.com",
      };

      const pendingResources: DiscoveredResourceRecord[] = [];
      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? gitlabFullSync(client, context, {
            batchSize: 100,
            syncMergeRequests,
            syncComments,
            lookbackDays,
            includeGroups,
            excludeGroups,
            visibilityFilter,
            // biome-ignore lint/suspicious/useAwait: callback signature requires Promise<void>
            onProjectsDiscovered: async (projects) => {
              for (const project of projects) {
                pendingResources.push({
                  externalId: String(project.id),
                  resourceType: "project",
                  name: project.path_with_namespace,
                  isPublic: project.visibility === "public",
                  metadata: {
                    description: project.description,
                    visibility: project.visibility,
                    starCount: project.star_count,
                  },
                });
              }
            },
          })
        : gitlabIncrementalSync(client, context, {
            lastSyncTime: (cursor?.lastSyncTime as number) ?? Date.now(),
            batchSize: 100,
            syncMergeRequests,
            syncComments,
            includeGroups,
            excludeGroups,
            visibilityFilter,
          });

      for await (const batch of syncGenerator) {
        const resourcesToYield =
          pendingResources.length > 0 ? [...pendingResources] : undefined;
        if (resourcesToYield) {
          pendingResources.length = 0;
        }

        yield {
          items: batch.items as GenericDocument[],
          cursor: batch.cursor as SyncCursor,
          hasMore: batch.hasMore,
          discoveredResources: resourcesToYield,
        };
      }
    }
  );

  registerSyncFactory(
    "ASANA",
    async function* (connectorId, connector, cursor, syncType) {
      const accessToken = await getValidAccessToken(connectorId);

      const config = connector.config as Record<string, unknown> | null;
      const workspaceGid = (config?.workspace_gid as string) ?? "";
      const syncComments = config?.sync_comments !== false;
      const syncCompletedTasks = config?.sync_completed_tasks === true;
      const lookbackDays = config?.lookback_days
        ? Number(config.lookback_days)
        : undefined;
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

      if (!workspaceGid) {
        throw ApplicationFailure.nonRetryable(
          "Asana workspace_gid not found in connector config",
          "ConfigurationError"
        );
      }

      logger.info({ connectorId, workspaceGid }, "Asana sync config loaded");

      const client = createAsanaClient({ connectorId, accessToken });

      const context = {
        connectorId: connector.id,
        connectorType: connector.type,
        teamId: connector.teamId,
        workspaceId: connector.workspaceExternalId ?? "",
        workspaceGid,
      };

      const runFull = shouldRunFullSync(syncType, cursor);

      const syncGenerator = runFull
        ? asanaFullSync(client, context, {
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            syncCompletedTasks,
            lookbackDays,
          })
        : asanaIncrementalSync(client, context, {
            cursor,
            batchSize: 50,
            includeProjects,
            excludeProjects,
            syncComments,
            syncCompletedTasks,
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
}
