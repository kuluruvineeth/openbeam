import type {
  FigmaSyncBatch,
  FigmaSyncCursor,
  FigmaTransformContext,
} from "@openbeam/types/services/connectors/figma";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllTeamFiles, getFileComments, getFileDetail } from "../api/files";
import type { FigmaClient } from "../client";
import { transformFigmaComment } from "../transformers/comment";
import {
  transformFigmaComponent,
  transformFigmaFile,
} from "../transformers/file";

export async function* figmaFullSync(
  client: FigmaClient,
  context: FigmaTransformContext,
  options: {
    batchSize?: number;
    syncComments?: boolean;
    syncComponents?: boolean;
    lookbackDays?: number;
    includeProjects?: string[];
    excludeProjects?: string[];
  } = {}
): AsyncGenerator<FigmaSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncComments = options.syncComments ?? true;
  const syncComponents = options.syncComponents ?? false;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const teamId = context.figmaTeamId;
  if (!teamId) {
    throw new Error("Figma team ID is required for sync");
  }

  const lookbackDate = options.lookbackDays
    ? new Date(Date.now() - options.lookbackDays * 86_400_000).toISOString()
    : undefined;

  for await (const { project, files } of getAllTeamFiles(client, teamId, {
    includeProjects: options.includeProjects,
    excludeProjects: options.excludeProjects,
  })) {
    for (const fileMeta of files) {
      if (lookbackDate && fileMeta.last_modified < lookbackDate) {
        skipped += 1;
        continue;
      }

      try {
        const needsDetail = syncComponents;
        const detail = needsDetail
          ? await getFileDetail(client, fileMeta.key)
          : undefined;

        documents.push(transformFigmaFile(fileMeta, context, detail));
        processed += 1;

        if (syncComponents && detail?.components) {
          for (const component of Object.values(detail.components)) {
            documents.push(
              transformFigmaComponent(
                component,
                fileMeta.key,
                fileMeta.name,
                context
              )
            );
            processed += 1;
          }
        }

        if (syncComments) {
          try {
            const comments = await getFileComments(client, fileMeta.key);
            for (const comment of comments) {
              documents.push(
                transformFigmaComment(comment, fileMeta.name, context)
              );
              processed += 1;
            }
          } catch (commentError) {
            logger.warn(
              { error: commentError, fileKey: fileMeta.key },
              "Failed to fetch comments for file"
            );
          }
        }
      } catch (error) {
        logger.error(
          { error, fileKey: fileMeta.key },
          "Error processing Figma file"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { lastSyncTime: Date.now() } as FigmaSyncCursor,
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }

    logger.info(
      {
        projectId: project.id,
        projectName: project.name,
        fileCount: files.length,
      },
      "Processed Figma project"
    );
  }

  yield {
    items: documents,
    cursor: { lastSyncTime: Date.now() } as FigmaSyncCursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
