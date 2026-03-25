import type {
  JenkinsSyncBatch,
  JenkinsSyncCursor,
  JenkinsSyncOptions,
  JenkinsTransformContext,
} from "@openbeam/types/services/connectors/jenkins";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getBuildConsoleOutput, listBuilds } from "../api/builds";
import { listJobs } from "../api/jobs";
import { listNodes } from "../api/nodes";
import { listViews } from "../api/views";
import type { JenkinsClient } from "../client";
import { transformBuild } from "../transformers/build";
import { transformJob } from "../transformers/job";
import { transformNode } from "../transformers/node";
import { transformView } from "../transformers/view";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* jenkinsFullSync(
  client: JenkinsClient,
  context: JenkinsTransformContext,
  options: JenkinsSyncOptions = {}
): AsyncGenerator<JenkinsSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncConsoleOutput = true,
    maxBuildsPerJob = 25,
    onStageChange,
  } = options;

  logger.info(
    { connectorId: client.connectorId, syncConsoleOutput, maxBuildsPerJob },
    "Jenkins full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: JenkinsSyncCursor = {
    lastSyncTime: Date.now(),
    lastBuildNumbers: {},
  };

  await onStageChange?.("Syncing jobs", state.processed);
  const jobs = await listJobs(client);

  for (const job of jobs) {
    try {
      await onStageChange?.("Processing jobs", state.processed, job.name);
      state.documents.push(await transformJob(job, context));
      state.processed += 1;

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    } catch (error) {
      logger.error(
        { error, jobName: job.name },
        "Error processing Jenkins job"
      );
      state.errors += 1;
    }
  }

  await onStageChange?.("Syncing builds", state.processed);
  for (const job of jobs) {
    try {
      const jobName = job.fullName ?? job.name;
      const builds = await listBuilds(client, jobName, maxBuildsPerJob);

      let maxBuildNumber = 0;
      for (const build of builds) {
        try {
          if (build.building) {
            state.skipped += 1;
            continue;
          }

          if (build.number > maxBuildNumber) {
            maxBuildNumber = build.number;
          }

          let consoleOutput: string | undefined;
          if (syncConsoleOutput) {
            consoleOutput = await getBuildConsoleOutput(
              client,
              jobName,
              build.number
            );
          }

          await onStageChange?.(
            "Processing builds",
            state.processed,
            `${jobName} #${build.number}`
          );

          state.documents.push(
            await transformBuild(build, jobName, context, consoleOutput)
          );
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            cursor.lastBuildNumbers = {
              ...cursor.lastBuildNumbers,
              [jobName]: maxBuildNumber,
            };
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, jobName, buildNumber: build.number },
            "Error processing Jenkins build"
          );
          state.errors += 1;
        }
      }

      if (maxBuildNumber > 0) {
        cursor.lastBuildNumbers = {
          ...cursor.lastBuildNumbers,
          [jobName]: maxBuildNumber,
        };
      }
    } catch (error) {
      logger.error(
        { error, jobName: job.name },
        "Error listing builds for Jenkins job"
      );
      state.errors += 1;
    }
  }

  if (options.syncConsoleOutput !== false) {
    await onStageChange?.("Syncing views", state.processed);
    const views = await listViews(client);
    for (const view of views) {
      try {
        state.documents.push(await transformView(view, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, viewName: view.name },
          "Error processing Jenkins view"
        );
        state.errors += 1;
      }
    }
  }

  await onStageChange?.("Syncing nodes", state.processed);
  const nodes = await listNodes(client);
  for (const node of nodes) {
    try {
      state.documents.push(await transformNode(node, context));
      state.processed += 1;
    } catch (error) {
      logger.error(
        { error, nodeName: node.displayName },
        "Error processing Jenkins node"
      );
      state.errors += 1;
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Jenkins full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
