import type {
  LinearComment,
  LinearIssue,
  LinearSyncBatch,
  LinearSyncCursor,
  LinearSyncOptions,
  LinearTransformContext,
} from "@openplane/types/services/connectors/linear";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { getAllDocuments } from "../api/documents";
import { getAllIssueComments, getAllTeamIssues } from "../api/issues";
import { getAllProjects } from "../api/projects";
import { getAllTeams } from "../api/teams";
import { createUserLookup } from "../api/users";
import type { LinearClient } from "../client";
import { transformDocument } from "../transformers/document";
import { transformIssue } from "../transformers/issue";
import { transformProject } from "../transformers/project";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export interface FullSyncOptions extends LinearSyncOptions {
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

// Note: Comments are fetched per-issue (N+1 pattern). Linear's GraphQL API
// requires accessing comments via issue.comments, preventing batch fetching
// across issues. This trade-off is acceptable given API constraints.
async function collectIssueComments(
  client: LinearClient,
  issueId: string,
  syncComments: boolean
): Promise<LinearComment[]> {
  if (!syncComments) {
    return [];
  }
  const comments: LinearComment[] = [];
  for await (const comment of getAllIssueComments(client, issueId)) {
    comments.push(comment);
  }
  return comments;
}

function shouldSkipEntity(
  updatedAt: string,
  archivedAt: string | null,
  lookbackTime: number | undefined
): boolean {
  if (archivedAt) {
    return true;
  }
  return shouldSkipByTime(updatedAt, lookbackTime);
}

interface ProcessIssueParams {
  client: LinearClient;
  issue: LinearIssue;
  context: LinearTransformContext;
  syncComments: boolean;
}

async function processIssue(
  params: ProcessIssueParams,
  state: SyncState
): Promise<void> {
  const { client, issue, context, syncComments } = params;
  const comments = await collectIssueComments(client, issue.id, syncComments);
  const document = await transformIssue(issue, context, {
    comments: comments.length > 0 ? comments : undefined,
  });
  state.documents.push(document);
  state.processed += 1;
}

export async function* fullSync(
  client: LinearClient,
  context: LinearTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<LinearSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncComments = true,
    syncDocuments = true,
    lookbackDays,
    onProgress,
    onStageChange,
    onTeamsDiscovered,
  } = options;

  logger.info(
    { syncComments, syncDocuments, lookbackDays },
    "Linear full sync started"
  );

  await onStageChange?.("Loading workspace users", 0);
  const userLookup = await createUserLookup(client);
  const enrichedContext = { ...context, userLookup };
  logger.info({ userCount: userLookup.size }, "User lookup created");

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };
  const cursor: LinearSyncCursor = {
    lastSyncTime: Date.now(),
    syncedTeams: [],
  };
  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  await onStageChange?.("Discovering teams", 0);
  const teams: Array<{ id: string; name: string }> = [];
  for await (const team of getAllTeams(client)) {
    teams.push({ id: team.id, name: team.name });
  }
  logger.info({ teamCount: teams.length }, "Teams discovered");

  if (teams.length > 0) {
    await onTeamsDiscovered?.(teams);
  }

  for (const team of teams) {
    await onStageChange?.(`Syncing team: ${team.name}`, state.processed);
    cursor.syncedTeams?.push(team.id);

    for await (const issue of getAllTeamIssues(client, team.id)) {
      if (shouldSkipEntity(issue.updatedAt, issue.archivedAt, lookbackTime)) {
        state.skipped += 1;
        continue;
      }

      try {
        await onStageChange?.(
          `Processing issues: ${team.name}`,
          state.processed,
          issue.identifier
        );
        await processIssue(
          { client, issue, context: enrichedContext, syncComments },
          state
        );

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
          onProgress?.(state);
        }
      } catch (error) {
        logger.error(
          { error, issueId: issue.id },
          "Error processing Linear issue"
        );
        state.errors += 1;
      }
    }
  }

  await onStageChange?.("Syncing projects", state.processed);
  for await (const project of getAllProjects(client)) {
    if (shouldSkipEntity(project.updatedAt, project.archivedAt, lookbackTime)) {
      state.skipped += 1;
      continue;
    }

    try {
      await onStageChange?.(
        "Processing projects",
        state.processed,
        project.name
      );
      state.documents.push(await transformProject(project, enrichedContext));
      state.processed += 1;

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
        onProgress?.(state);
      }
    } catch (error) {
      logger.error(
        { error, projectId: project.id },
        "Error processing Linear project"
      );
      state.errors += 1;
    }
  }

  if (syncDocuments) {
    await onStageChange?.("Syncing documents", state.processed);
    for await (const doc of getAllDocuments(client)) {
      if (shouldSkipEntity(doc.updatedAt, doc.archivedAt, lookbackTime)) {
        state.skipped += 1;
        continue;
      }

      try {
        await onStageChange?.(
          "Processing documents",
          state.processed,
          doc.title
        );
        state.documents.push(await transformDocument(doc, enrichedContext));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
          onProgress?.(state);
        }
      } catch (error) {
        logger.error(
          { error, documentId: doc.id },
          "Error processing Linear document"
        );
        state.errors += 1;
      }
    }
  }

  logger.info(
    { ...state, documentsCount: state.documents.length },
    "Linear full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}

function shouldSkipByTime(
  updatedAt: string,
  lookbackTime: number | undefined
): boolean {
  if (!lookbackTime) {
    return false;
  }
  const editedAt = new Date(updatedAt).getTime();
  return editedAt < lookbackTime;
}
