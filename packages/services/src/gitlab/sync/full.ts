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
import { transformProject } from "../transformers/project";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function shouldSkipByTime(
  updatedAt: string,
  lookbackTime: number | undefined
): boolean {
  if (!lookbackTime) {
    return false;
  }
  return new Date(updatedAt).getTime() < lookbackTime;
}

function matchesGroupFilter(
  project: GitLabProject,
  includeGroups: string[],
  excludeGroups: string[]
): boolean {
  const namespacePath =
    project.namespace?.full_path ??
    project.path_with_namespace.split("/")[0] ??
    "";

  if (excludeGroups.length > 0) {
    for (const group of excludeGroups) {
      if (namespacePath === group || namespacePath.startsWith(`${group}/`)) {
        return false;
      }
    }
  }

  if (includeGroups.length > 0) {
    return includeGroups.some(
      (group) =>
        namespacePath === group || namespacePath.startsWith(`${group}/`)
    );
  }

  return true;
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

export async function* fullSync(
  client: GitLabClient,
  context: GitLabTransformContext,
  options: GitLabSyncOptions = {}
): AsyncGenerator<GitLabSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncMergeRequests = true,
    syncComments = true,
    lookbackDays,
    includeGroups = [],
    excludeGroups = [],
    visibilityFilter,
    onStageChange,
    onProjectsDiscovered,
  } = options;

  logger.info(
    { syncMergeRequests, syncComments, lookbackDays },
    "GitLab full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };
  const cursor: GitLabSyncCursor = {
    lastSyncTime: Date.now(),
    syncedProjects: [],
  };
  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  await onStageChange?.("Discovering projects", 0);
  const projects: GitLabProject[] = [];
  for await (const project of getAllProjects(client, {
    visibility: visibilityFilter,
  })) {
    if (project.archived) {
      continue;
    }
    if (!matchesGroupFilter(project, includeGroups, excludeGroups)) {
      continue;
    }
    projects.push(project);
  }
  logger.info({ projectCount: projects.length }, "Projects discovered");

  if (projects.length > 0) {
    await onProjectsDiscovered?.(projects);
  }

  for (const project of projects) {
    cursor.syncedProjects?.push(project.path_with_namespace);
    const projectPath = project.path_with_namespace;
    const isPrivate = project.visibility === "private";

    await onStageChange?.(`Syncing project: ${projectPath}`, state.processed);

    try {
      state.documents.push(await transformProject(project, context));
      state.processed += 1;
    } catch (error) {
      logger.error(
        { error, projectId: project.id },
        "Error transforming project"
      );
      state.errors += 1;
    }

    await onStageChange?.(`Syncing issues: ${projectPath}`, state.processed);

    try {
      for await (const issue of getAllProjectIssues(client, project.id)) {
        if (shouldSkipByTime(issue.updated_at, lookbackTime)) {
          state.skipped += 1;
          continue;
        }

        const notes = await collectNotes({
          client,
          projectId: project.id,
          entityIid: issue.iid,
          type: "issue",
          enabled: syncComments,
        });

        state.documents.push(
          await transformIssue(issue, context, {
            projectPath,
            isProjectPrivate: isPrivate,
            notes,
          })
        );
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      }
    } catch (error) {
      logger.error(
        { error, stage: `issues: ${projectPath}` },
        "Error during sync stage"
      );
      state.errors += 1;
    }

    if (syncMergeRequests) {
      await onStageChange?.(
        `Syncing merge requests: ${projectPath}`,
        state.processed
      );

      try {
        for await (const mr of getAllProjectMergeRequests(client, project.id)) {
          if (shouldSkipByTime(mr.updated_at, lookbackTime)) {
            state.skipped += 1;
            continue;
          }

          const notes = await collectNotes({
            client,
            projectId: project.id,
            entityIid: mr.iid,
            type: "merge_request",
            enabled: syncComments,
          });

          state.documents.push(
            await transformMergeRequest(mr, context, {
              projectPath,
              isProjectPrivate: isPrivate,
              notes,
            })
          );
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        }
      } catch (error) {
        logger.error(
          { error, stage: `merge_requests: ${projectPath}` },
          "Error during sync stage"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  logger.info(
    { ...state, documentsCount: state.documents.length },
    "GitLab full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
