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
import { jenkinsFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* jenkinsIncrementalSync(
  client: JenkinsClient,
  context: JenkinsTransformContext,
  options: JenkinsSyncOptions = {}
): AsyncGenerator<JenkinsSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncConsoleOutput = true,
    maxBuildsPerJob = 25,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor.lastBuildNumbers)) {
    yield* jenkinsFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Jenkins incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  const newBuildNumbers: Record<string, number> = {
    ...cursor.lastBuildNumbers,
  };

  try {
    await onStageChange?.("Syncing updated jobs", processed);
    const jobs = await listJobs(client);

    for (const job of jobs) {
      try {
        documents.push(await transformJob(job, context));
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: cursor.lastSyncTime,
              lastBuildNumbers: newBuildNumbers,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      } catch (error) {
        logger.error({ error, jobName: job.name }, "Error processing job");
        errors += 1;
      }
    }

    await onStageChange?.("Syncing new builds", processed);
    for (const job of jobs) {
      const jobName = job.fullName ?? job.name;
      const lastKnownBuild = cursor.lastBuildNumbers[jobName] ?? 0;

      try {
        const builds = await listBuilds(client, jobName, maxBuildsPerJob);
        let maxBuildNumber = lastKnownBuild;

        for (const build of builds) {
          if (build.number <= lastKnownBuild || build.building) {
            continue;
          }

          try {
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

            documents.push(
              await transformBuild(build, jobName, context, consoleOutput)
            );
            processed += 1;

            if (documents.length >= batchSize) {
              newBuildNumbers[jobName] = maxBuildNumber;
              yield createSyncBatch(
                documents,
                {
                  lastSyncTime: cursor.lastSyncTime,
                  lastBuildNumbers: newBuildNumbers,
                },
                true,
                { processed, skipped: 0, errors }
              );
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, jobName, buildNumber: build.number },
              "Error processing build in incremental sync"
            );
            errors += 1;
          }
        }

        if (maxBuildNumber > lastKnownBuild) {
          newBuildNumbers[jobName] = maxBuildNumber;
        }
      } catch (error) {
        logger.error(
          { error, jobName },
          "Error listing builds in incremental sync"
        );
        errors += 1;
      }
    }

    await onStageChange?.("Syncing views", processed);
    const views = await listViews(client);
    for (const view of views) {
      try {
        documents.push(await transformView(view, context));
        processed += 1;
      } catch (error) {
        logger.error({ error, viewName: view.name }, "Error processing view");
        errors += 1;
      }
    }

    await onStageChange?.("Syncing nodes", processed);
    const nodes = await listNodes(client);
    for (const node of nodes) {
      try {
        documents.push(await transformNode(node, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, nodeName: node.displayName },
          "Error processing node"
        );
        errors += 1;
      }
    }

    const newCursor: JenkinsSyncCursor = {
      lastSyncTime: Date.now(),
      lastBuildNumbers: newBuildNumbers,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Jenkins incremental sync failed, falling back to full"
    );
    yield* jenkinsFullSync(client, context, options);
  }
}
