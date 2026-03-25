import type {
  JFrogSyncBatch,
  JFrogSyncCursor,
  JFrogSyncOptions,
  JFrogTransformContext,
} from "@openbeam/types/services/connectors/jfrog";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listArtifacts } from "../api/artifacts";
import { listRecentBuilds } from "../api/builds";
import { listRepositories } from "../api/repositories";
import { listViolations } from "../api/violations";
import type { JFrogClient } from "../client";
import { transformArtifact } from "../transformers/artifact";
import { transformBuild } from "../transformers/build";
import { transformRepository } from "../transformers/repository";
import { transformViolation } from "../transformers/violation";
import { jfrogFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* jfrogIncrementalSync(
  client: JFrogClient,
  context: JFrogTransformContext,
  options: JFrogSyncOptions = {}
): AsyncGenerator<JFrogSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncBuilds = true,
    syncViolations = true,
    onStageChange,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* jfrogFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "JFrog incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestArtifactModified = cursor.lastArtifactModified;
  let latestBuildTimestamp = cursor.lastBuildTimestamp;

  try {
    await onStageChange?.("Syncing repositories", processed);
    const repos = await listRepositories(client);
    for (const repo of repos) {
      try {
        documents.push(await transformRepository(repo, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, repoKey: repo.key },
          "Error processing repository"
        );
        errors += 1;
      }
    }

    await onStageChange?.("Syncing updated artifacts", processed);

    const modifiedSince = cursor.lastArtifactModified;
    for await (const artifacts of listArtifacts(client, { modifiedSince })) {
      for (const artifact of artifacts) {
        try {
          if (
            !latestArtifactModified ||
            artifact.modified > latestArtifactModified
          ) {
            latestArtifactModified = artifact.modified;
          }

          documents.push(await transformArtifact(artifact, context));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(
              documents,
              {
                lastSyncTime: cursor.lastSyncTime,
                lastArtifactModified: latestArtifactModified,
                lastBuildTimestamp: latestBuildTimestamp,
              },
              true,
              { processed, skipped: 0, errors }
            );
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, artifact: `${artifact.repo}/${artifact.name}` },
            "Error processing artifact in incremental sync"
          );
          errors += 1;
        }
      }
    }

    if (syncBuilds) {
      await onStageChange?.("Syncing recent builds", processed);

      for await (const builds of listRecentBuilds(
        client,
        cursor.lastBuildTimestamp
      )) {
        for (const build of builds) {
          try {
            const buildTs = new Date(build.buildStarted).getTime();
            if (!latestBuildTimestamp || buildTs > latestBuildTimestamp) {
              latestBuildTimestamp = buildTs;
            }

            documents.push(await transformBuild(build, context));
            processed += 1;

            if (documents.length >= batchSize) {
              yield createSyncBatch(
                documents,
                {
                  lastSyncTime: cursor.lastSyncTime,
                  lastArtifactModified: latestArtifactModified,
                  lastBuildTimestamp: latestBuildTimestamp,
                },
                true,
                { processed, skipped: 0, errors }
              );
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, build: `${build.buildName}#${build.buildNumber}` },
              "Error processing build in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncViolations) {
      await onStageChange?.("Syncing recent violations", processed);

      const sinceDate = new Date(cursor.lastSyncTime).toISOString();
      for await (const violations of listViolations(client, {
        createdFrom: sinceDate,
      })) {
        for (const violation of violations) {
          try {
            documents.push(await transformViolation(violation, context));
            processed += 1;

            if (documents.length >= batchSize) {
              yield createSyncBatch(
                documents,
                {
                  lastSyncTime: cursor.lastSyncTime,
                  lastArtifactModified: latestArtifactModified,
                  lastBuildTimestamp: latestBuildTimestamp,
                },
                true,
                { processed, skipped: 0, errors }
              );
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, violationId: violation.id },
              "Error processing violation in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: JFrogSyncCursor = {
      lastSyncTime: Date.now(),
      lastArtifactModified: latestArtifactModified,
      lastBuildTimestamp: latestBuildTimestamp,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "JFrog incremental sync failed, falling back to full"
    );
    yield* jfrogFullSync(client, context, options);
  }
}
