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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* jfrogFullSync(
  client: JFrogClient,
  context: JFrogTransformContext,
  options: JFrogSyncOptions = {}
): AsyncGenerator<JFrogSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncBuilds = true,
    syncViolations = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncBuilds,
      syncViolations,
    },
    "JFrog full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: JFrogSyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestArtifactModified: string | undefined;
  let latestBuildTimestamp: number | undefined;

  await onStageChange?.("Syncing repositories", state.processed);
  const repos = await listRepositories(client);

  for (const repo of repos) {
    try {
      await onStageChange?.(
        "Processing repositories",
        state.processed,
        repo.key
      );
      state.documents.push(await transformRepository(repo, context));
      state.processed += 1;

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    } catch (error) {
      logger.error(
        { error, repoKey: repo.key },
        "Error processing JFrog repository"
      );
      state.errors += 1;
    }
  }

  await onStageChange?.("Syncing artifacts", state.processed);

  for await (const artifacts of listArtifacts(client)) {
    for (const artifact of artifacts) {
      try {
        await onStageChange?.(
          "Processing artifacts",
          state.processed,
          `${artifact.repo}/${artifact.name}`
        );

        if (
          !latestArtifactModified ||
          artifact.modified > latestArtifactModified
        ) {
          latestArtifactModified = artifact.modified;
        }

        state.documents.push(await transformArtifact(artifact, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastArtifactModified = latestArtifactModified;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, artifact: `${artifact.repo}/${artifact.name}` },
          "Error processing JFrog artifact"
        );
        state.errors += 1;
      }
    }
  }

  if (syncBuilds) {
    await onStageChange?.("Syncing builds", state.processed);

    for await (const builds of listRecentBuilds(client)) {
      for (const build of builds) {
        try {
          await onStageChange?.(
            "Processing builds",
            state.processed,
            `${build.buildName} #${build.buildNumber}`
          );

          const buildTs = new Date(build.buildStarted).getTime();
          if (!latestBuildTimestamp || buildTs > latestBuildTimestamp) {
            latestBuildTimestamp = buildTs;
          }

          state.documents.push(await transformBuild(build, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            cursor.lastBuildTimestamp = latestBuildTimestamp;
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, build: `${build.buildName}#${build.buildNumber}` },
            "Error processing JFrog build"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncViolations) {
    await onStageChange?.("Syncing violations", state.processed);

    for await (const violations of listViolations(client)) {
      for (const violation of violations) {
        try {
          await onStageChange?.(
            "Processing violations",
            state.processed,
            violation.summary ?? violation.id
          );

          state.documents.push(await transformViolation(violation, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, violationId: violation.id },
            "Error processing JFrog violation"
          );
          state.errors += 1;
        }
      }
    }
  }

  cursor.lastArtifactModified = latestArtifactModified;
  cursor.lastBuildTimestamp = latestBuildTimestamp;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "JFrog full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
