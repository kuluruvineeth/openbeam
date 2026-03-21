import type {
  ConfluenceSyncBatch,
  ConfluenceSyncCursor,
  ConfluenceTransformContext,
} from "@openbeam/types/services/connectors/confluence";
import type { GenericDocument } from "@openbeam/vespa";
import type { AtlassianClient } from "../../atlassian/client";
import { logger } from "../../lib/logger";
import type { ConfluenceComment } from "../api/comments";
import { transformConfluenceComment } from "../transformers/comment";
import {
  type ConfluencePage,
  transformConfluencePage,
} from "../transformers/page";
import { confluenceFullSync } from "./full";

type CqlSearchResult = {
  results: Array<{
    content: {
      id: string;
      type: string;
      status: string;
      title: string;
      space?: { key: string; name: string };
      body?: { storage?: { value: string; representation: string } };
      version?: {
        number: number;
        when: string;
        by?: { accountId: string };
      };
      _links?: { webui?: string };
      history?: {
        createdDate: string;
        createdBy?: { accountId: string };
      };
      metadata?: {
        labels?: { results?: Array<{ name: string }> };
      };
    };
  }>;
  start: number;
  limit: number;
  size: number;
  totalSize: number;
  _links?: { next?: string };
};

type IncrementalSyncOptions = {
  cursor?: ConfluenceSyncCursor;
  batchSize?: number;
  includeSpaces?: string[];
  excludeSpaces?: string[];
  syncComments?: boolean;
  labelsFilter?: string[];
  syncArchived?: boolean;
};

export async function* confluenceIncrementalSync(
  client: AtlassianClient,
  context: ConfluenceTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<ConfluenceSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;
  const syncComments = options.syncComments ?? false;
  const labelsFilter = options.labelsFilter ?? [];
  const syncArchived = options.syncArchived ?? false;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* confluenceFullSync(client, context, {
      batchSize,
      includeSpaces: options.includeSpaces,
      excludeSpaces: options.excludeSpaces,
      syncComments,
      labelsFilter,
      syncArchived,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified: string | undefined = cursor.lastSyncTime;

  const formattedDate = cursor.lastSyncTime.slice(0, 16).replace("T", " ");

  const typeFilter = syncComments
    ? 'type IN ("page","blogpost","comment")'
    : 'type IN ("page","blogpost")';
  const cql = `lastModified>="${formattedDate}" AND ${typeFilter} ORDER BY lastModified ASC`;

  let start = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    try {
      const result = await client.get<CqlSearchResult>(
        "/wiki/rest/api/content/search",
        {
          cql,
          expand: "body.storage,version,space,metadata.labels",
          start: String(start),
          limit: String(limit),
        }
      );

      for (const item of result.results) {
        const c = item.content;

        if (c.type === "comment") {
          if (!syncComments) {
            continue;
          }

          const comment: ConfluenceComment = {
            id: c.id,
            status: c.status,
            title: c.title,
            body: c.body as ConfluenceComment["body"],
            version: c.version
              ? {
                  number: c.version.number,
                  createdAt: c.version.when,
                  authorId: c.version.by?.accountId,
                }
              : undefined,
            createdAt:
              c.history?.createdDate ??
              c.version?.when ??
              new Date().toISOString(),
            authorId: c.history?.createdBy?.accountId,
          };

          try {
            const doc = transformConfluenceComment(comment, context, {
              pageId: c.space?.key ?? "",
              pageTitle: c.title,
              spaceKey: c.space?.key,
              spaceName: c.space?.name,
            });
            documents.push(doc);
            processed += 1;
          } catch (error) {
            logger.error(
              { error, commentId: c.id },
              "Error transforming Confluence comment"
            );
            errors += 1;
          }
          continue;
        }

        if (c.status === "trashed") {
          const docType = c.type === "blogpost" ? "blogpost" : "page";
          documents.push({
            id: `${context.connectorId}_${docType}_${c.id}`,
            connector_id: context.connectorId,
            connector_type: context.connectorType,
            team_id: context.teamId,
            workspace_id: context.workspaceId,
            external_id: c.id,
            document_type: docType,
            title: "",
            content: "",
            url: "",
            metadata: { deleted: true },
          } as unknown as GenericDocument);
          processed += 1;
          continue;
        }

        if (c.status === "archived" && !syncArchived) {
          continue;
        }

        if (labelsFilter.length > 0) {
          const pageLabels =
            c.metadata?.labels?.results?.map((l) => l.name.toLowerCase()) ?? [];
          const matches = labelsFilter.some((f) =>
            pageLabels.includes(f.toLowerCase())
          );
          if (!matches) {
            continue;
          }
        }

        const docType =
          c.type === "blogpost" ? ("blogpost" as const) : ("page" as const);

        const page: ConfluencePage = {
          id: c.id,
          status: c.status,
          title: c.title,
          spaceId: c.space?.key ?? "",
          authorId: c.history?.createdBy?.accountId,
          createdAt:
            c.history?.createdDate ??
            c.version?.when ??
            new Date().toISOString(),
          version: c.version
            ? {
                number: c.version.number,
                createdAt: c.version.when,
                authorId: c.version.by?.accountId,
              }
            : undefined,
          body: c.body,
          _links: c._links,
          labels: c.metadata?.labels,
        };

        const spaceInfo = c.space
          ? { key: c.space.key, name: c.space.name }
          : undefined;

        try {
          const doc = transformConfluencePage(
            page,
            context,
            spaceInfo,
            docType
          );
          documents.push(doc);
          processed += 1;

          const pageModified = c.version?.when ?? page.createdAt;
          if (!latestModified || pageModified > latestModified) {
            latestModified = pageModified;
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestModified,
                lastFullSync: cursor.lastFullSync,
              },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, pageId: c.id },
            "Error transforming Confluence content"
          );
          errors += 1;
        }
      }

      hasMore = result.size === limit;
      start += limit;
    } catch (error) {
      logger.warn({ error }, "CQL search failed, falling back to full sync");
      yield* confluenceFullSync(client, context, {
        batchSize,
        includeSpaces: options.includeSpaces,
        excludeSpaces: options.excludeSpaces,
        syncComments,
        labelsFilter,
        syncArchived,
      });
      return;
    }
  }

  yield {
    items: documents,
    cursor: {
      lastSyncTime: latestModified,
      lastFullSync: cursor.lastFullSync,
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
