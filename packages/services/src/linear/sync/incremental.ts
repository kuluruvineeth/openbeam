import type {
  LinearComment,
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

export interface IncrementalSyncOptions extends LinearSyncOptions {
  lastSyncTime: number;
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sync orchestration requires handling multiple data sources
export async function* incrementalSync(
  client: LinearClient,
  context: LinearTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<LinearSyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    batchSize = DEFAULT_BATCH_SIZE,
    syncComments = true,
    syncDocuments = true,
    onProgress,
    onStageChange,
  } = options;

  const updatedSince = new Date(lastSyncTime).toISOString();
  logger.info({ updatedSince }, "Linear incremental sync started");

  await onStageChange?.("Loading workspace users", 0);
  const userLookup = await createUserLookup(client);
  const enrichedContext = { ...context, userLookup };

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: LinearSyncCursor = {
    lastSyncTime: Date.now(),
    syncedTeams: [],
  };

  const filter = { updatedAt: { gte: updatedSince } };

  await onStageChange?.("Checking for updated issues", 0);

  const teams: Array<{ id: string; name: string }> = [];
  for await (const team of getAllTeams(client)) {
    teams.push({ id: team.id, name: team.name });
  }

  for (const team of teams) {
    cursor.syncedTeams?.push(team.id);

    for await (const issue of getAllTeamIssues(client, team.id, filter)) {
      try {
        await onStageChange?.(
          `Processing updated issues: ${team.name}`,
          processed,
          issue.identifier
        );

        let comments: LinearComment[] | undefined;
        if (syncComments) {
          comments = [];
          for await (const comment of getAllIssueComments(client, issue.id)) {
            comments.push(comment);
          }
        }

        const document = transformIssue(issue, enrichedContext, { comments });
        documents.push(document);
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(documents, cursor, true, {
            processed,
            skipped: 0,
            errors,
          });
          documents = [];
          onProgress?.({ processed, skipped: 0, errors });
        }
      } catch (error) {
        logger.error(
          { error, issueId: issue.id },
          "Error processing Linear issue"
        );
        errors += 1;
      }
    }
  }

  await onStageChange?.("Checking for updated projects", processed);
  for await (const project of getAllProjects(client, filter)) {
    try {
      await onStageChange?.(
        "Processing updated projects",
        processed,
        project.name
      );

      const document = transformProject(project, enrichedContext);
      documents.push(document);
      processed += 1;

      if (documents.length >= batchSize) {
        yield createSyncBatch(documents, cursor, true, {
          processed,
          skipped: 0,
          errors,
        });
        documents = [];
        onProgress?.({ processed, skipped: 0, errors });
      }
    } catch (error) {
      logger.error(
        { error, projectId: project.id },
        "Error processing Linear project"
      );
      errors += 1;
    }
  }

  if (syncDocuments) {
    await onStageChange?.("Checking for updated documents", processed);
    for await (const doc of getAllDocuments(client, filter)) {
      try {
        await onStageChange?.(
          "Processing updated documents",
          processed,
          doc.title
        );

        const document = transformDocument(doc, enrichedContext);
        documents.push(document);
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(documents, cursor, true, {
            processed,
            skipped: 0,
            errors,
          });
          documents = [];
          onProgress?.({ processed, skipped: 0, errors });
        }
      } catch (error) {
        logger.error(
          { error, documentId: doc.id },
          "Error processing Linear document"
        );
        errors += 1;
      }
    }
  }

  logger.info(
    { processed, errors, documentsCount: documents.length },
    "Linear incremental sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}
