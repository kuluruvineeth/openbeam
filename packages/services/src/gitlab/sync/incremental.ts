import type {
  GitLabNote,
  GitLabProject,
  GitLabSyncBatch,
  GitLabSyncCursor,
  GitLabSyncOptions,
  GitLabTransformContext,
} from "@openbeam/types/services/connectors/gitlab";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllProjectIssues, getIssueNotes } from "../api/issues";
import {
  getAllProjectMergeRequests,
  getMergeRequestNotes,
} from "../api/merge-requests";
import { getAllProjects } from "../api/projects";
import type { GitLabClient } from "../client";
import { transformIssue } from "../transformers/issue";
import { transformMergeRequest } from "../transformers/merge-request";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface IncrementalSyncOptions extends GitLabSyncOptions {
  lastSyncTime: number;
}

async function collectNotes(opts: {
  client: GitLabClient;
  projectId: number;
  entityIid: number;
  type: "issue" | "merge_request";
  enabled: boolean;
}): Promise<GitLabNote[] | undefined> {
  const { client, projectId, entityIid, type, enabled } = opts;
  if (!enabled) {
    return;
  }

  const notes: GitLabNote[] = [];
  const generator =
    type === "issue"
      ? getIssueNotes(client, projectId, entityIid)
      : getMergeRequestNotes(client, projectId, entityIid);

  for await (const note of generator) {
    notes.push(note);
  }

  return notes.length > 0 ? notes : undefined;
}

export async function* incrementalSync(
  client: GitLabClient,
  context: GitLabTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<GitLabSyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    batchSize = DEFAULT_BATCH_SIZE,
    syncMergeRequests = true,
    syncComments = true,
    includeGroups = [],
    excludeGroups = [],
    visibilityFilter,
    onStageChange,
  } = options;

  const updatedAfter = new Date(lastSyncTime).toISOString();
  logger.info(
    { updatedAfter, syncMergeRequests, syncComments },
    "GitLab incremental sync started"
  );

  const documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  const cursor: GitLabSyncCursor = {
    lastSyncTime: Date.now(),
    syncedProjects: [],
  };

  await onStageChange?.("Loading projects", 0);
  const projects: GitLabProject[] = [];
  for await (const project of getAllProjects(client, {
    visibility: visibilityFilter,
  })) {
    if (project.archived) {
      continue;
    }

    const namespacePath =
      project.namespace?.full_path ??
      project.path_with_namespace.split("/")[0] ??
      "";

    if (excludeGroups.length > 0) {
      const excluded = excludeGroups.some(
        (g) => namespacePath === g || namespacePath.startsWith(`${g}/`)
      );
      if (excluded) {
        continue;
      }
    }

    if (includeGroups.length > 0) {
      const included = includeGroups.some(
        (g) => namespacePath === g || namespacePath.startsWith(`${g}/`)
      );
      if (!included) {
        continue;
      }
    }

    projects.push(project);
  }

  for (const project of projects) {
    const projectPath = project.path_with_namespace;
    const isPrivate = project.visibility === "private";
    cursor.syncedProjects?.push(projectPath);

    await onStageChange?.(`Incremental issues: ${projectPath}`, processed);

    try {
      for await (const issue of getAllProjectIssues(
        client,
        project.id,
        updatedAfter
      )) {
        const notes = await collectNotes({
          client,
          projectId: project.id,
          entityIid: issue.iid,
          type: "issue",
          enabled: syncComments,
        });

        documents.push(
          await transformIssue(issue, context, {
            projectPath,
            isProjectPrivate: isPrivate,
            notes,
          })
        );
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents.splice(0, documents.length),
            cursor,
            true,
            { processed, skipped, errors }
          );
        }
      }
    } catch (error) {
      logger.error(
        { error, stage: `issues: ${projectPath}` },
        "Incremental sync error"
      );
      errors += 1;
    }

    if (syncMergeRequests) {
      await onStageChange?.(`Incremental MRs: ${projectPath}`, processed);

      try {
        for await (const mr of getAllProjectMergeRequests(
          client,
          project.id,
          updatedAfter
        )) {
          const notes = await collectNotes({
            client,
            projectId: project.id,
            entityIid: mr.iid,
            type: "merge_request",
            enabled: syncComments,
          });

          documents.push(
            await transformMergeRequest(mr, context, {
              projectPath,
              isProjectPrivate: isPrivate,
              notes,
            })
          );
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(
              documents.splice(0, documents.length),
              cursor,
              true,
              { processed, skipped, errors }
            );
          }
        }
      } catch (error) {
        logger.error(
          { error, stage: `merge_requests: ${projectPath}` },
          "Incremental sync error"
        );
        errors += 1;
      }
    }
  }

  logger.info(
    { processed, skipped, errors, documentsCount: documents.length },
    "GitLab incremental sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped,
      errors,
    });
  }
}
