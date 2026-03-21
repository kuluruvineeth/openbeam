import type {
  ConfluenceSyncBatch,
  ConfluenceSyncCursor,
  ConfluenceTransformContext,
} from "@openbeam/types/services/connectors/confluence";
import type { GenericDocument } from "@openbeam/vespa";
import type { AtlassianClient } from "../../atlassian/client";
import { logger } from "../../lib/logger";
import { listBlogpostComments, listPageComments } from "../api/comments";
import { transformConfluenceComment } from "../transformers/comment";
import {
  type ConfluencePage,
  type ConfluenceSpaceInfo,
  transformConfluencePage,
} from "../transformers/page";

type ConfluenceSpace = {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
};

type FullSyncOptions = {
  batchSize?: number;
  includeSpaces?: string[];
  excludeSpaces?: string[];
  syncComments?: boolean;
  labelsFilter?: string[];
  syncArchived?: boolean;
};

export async function* confluenceFullSync(
  client: AtlassianClient,
  context: ConfluenceTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<ConfluenceSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncComments = options.syncComments ?? false;
  const labelsFilter = options.labelsFilter ?? [];
  const syncArchived = options.syncArchived ?? false;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestModified: string | undefined;

  const spaces = await fetchSpaces(client, options);

  for (const space of spaces) {
    const spaceInfo: ConfluenceSpaceInfo = {
      key: space.key,
      name: space.name,
    };

    logger.info(
      { connectorId: client.connectorId, spaceKey: space.key },
      "Syncing Confluence space"
    );

    for await (const pages of client.paginate<ConfluencePage>(
      `/wiki/api/v2/spaces/${space.id}/pages`,
      { "body-format": "storage", sort: "-modified-date" },
      { pageSize: 250 }
    )) {
      for (const page of pages) {
        if (page.status === "trashed") {
          skipped += 1;
          continue;
        }

        if (page.status === "archived" && !syncArchived) {
          skipped += 1;
          continue;
        }

        if (labelsFilter.length > 0 && !pageMatchesLabels(page, labelsFilter)) {
          skipped += 1;
          continue;
        }

        try {
          const doc = transformConfluencePage(page, context, spaceInfo, "page");
          documents.push(doc);
          processed += 1;

          trackLatestModified(page, latestModified, (ts) => {
            latestModified = ts;
          });

          if (syncComments) {
            const commentDocs = await fetchPageComments({
              client,
              page,
              context,
              spaceInfo,
            });
            documents.push(...commentDocs);
            processed += commentDocs.length;
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestModified,
                lastFullSync: Date.now(),
              },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, pageId: page.id },
            "Error transforming Confluence page"
          );
          errors += 1;
        }
      }
    }

    for await (const posts of client.paginate<ConfluencePage>(
      "/wiki/api/v2/blogposts",
      {
        "body-format": "storage",
        sort: "-modified-date",
        "space-id": space.id,
      },
      { pageSize: 250 }
    )) {
      for (const post of posts) {
        if (post.status === "trashed") {
          skipped += 1;
          continue;
        }

        if (post.status === "archived" && !syncArchived) {
          skipped += 1;
          continue;
        }

        try {
          const doc = transformConfluencePage(
            post,
            context,
            spaceInfo,
            "blogpost"
          );
          documents.push(doc);
          processed += 1;

          trackLatestModified(post, latestModified, (ts) => {
            latestModified = ts;
          });

          if (syncComments) {
            const commentDocs = await fetchBlogpostComments({
              client,
              page: post,
              context,
              spaceInfo,
            });
            documents.push(...commentDocs);
            processed += commentDocs.length;
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestModified,
                lastFullSync: Date.now(),
              },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, postId: post.id },
            "Error transforming Confluence blogpost"
          );
          errors += 1;
        }
      }
    }
  }

  const cursor: ConfluenceSyncCursor = {
    lastSyncTime: latestModified,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

type FetchCommentsParams = {
  client: AtlassianClient;
  page: ConfluencePage;
  context: ConfluenceTransformContext;
  spaceInfo: ConfluenceSpaceInfo;
};

async function fetchPageComments(
  params: FetchCommentsParams
): Promise<GenericDocument[]> {
  const { client, page, context, spaceInfo } = params;
  const docs: GenericDocument[] = [];
  const commentIterator = listPageComments(client, page.id);

  try {
    for await (const comments of commentIterator) {
      for (const comment of comments) {
        docs.push(
          transformConfluenceComment(comment, context, {
            pageId: page.id,
            pageTitle: page.title,
            spaceKey: spaceInfo.key,
            spaceName: spaceInfo.name,
          })
        );
      }
    }
  } catch (error) {
    logger.warn(
      { error, pageId: page.id },
      "Failed to fetch comments for page"
    );
  }

  return docs;
}

async function fetchBlogpostComments(
  params: FetchCommentsParams
): Promise<GenericDocument[]> {
  const { client, page, context, spaceInfo } = params;
  const docs: GenericDocument[] = [];
  const commentIterator = listBlogpostComments(client, page.id);

  try {
    for await (const comments of commentIterator) {
      for (const comment of comments) {
        docs.push(
          transformConfluenceComment(comment, context, {
            pageId: page.id,
            pageTitle: page.title,
            spaceKey: spaceInfo.key,
            spaceName: spaceInfo.name,
          })
        );
      }
    }
  } catch (error) {
    logger.warn(
      { error, pageId: page.id },
      "Failed to fetch comments for blogpost"
    );
  }

  return docs;
}

function pageMatchesLabels(
  page: ConfluencePage,
  labelsFilter: string[]
): boolean {
  const pageLabels =
    page.labels?.results?.map((l) => l.name.toLowerCase()) ?? [];
  return labelsFilter.some((f) => pageLabels.includes(f.toLowerCase()));
}

async function fetchSpaces(
  client: AtlassianClient,
  options: { includeSpaces?: string[]; excludeSpaces?: string[] }
): Promise<ConfluenceSpace[]> {
  const allSpaces: ConfluenceSpace[] = [];

  for await (const batch of client.paginate<ConfluenceSpace>(
    "/wiki/api/v2/spaces",
    { status: "current" },
    { pageSize: 250 }
  )) {
    allSpaces.push(...batch);
  }

  return allSpaces.filter((space) => {
    if (
      options.includeSpaces?.length &&
      !options.includeSpaces.includes(space.key)
    ) {
      return false;
    }
    if (options.excludeSpaces?.includes(space.key)) {
      return false;
    }
    return true;
  });
}

function trackLatestModified(
  page: ConfluencePage,
  current: string | undefined,
  update: (ts: string) => void
): void {
  const pageModified = page.version?.createdAt ?? page.createdAt;
  if (!current || pageModified > current) {
    update(pageModified);
  }
}
