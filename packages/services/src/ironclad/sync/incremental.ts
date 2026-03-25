import type {
  IroncladSyncBatch,
  IroncladSyncCursor,
  IroncladSyncOptions,
  IroncladTransformContext,
} from "@openbeam/types/services/connectors/ironclad";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listApprovals } from "../api/approvals";
import { listComments } from "../api/comments";
import { listRecords } from "../api/records";
import { listWorkflows } from "../api/workflows";
import type { IroncladClient } from "../client";
import { transformApproval } from "../transformers/approval";
import { transformComment } from "../transformers/comment";
import { transformRecord } from "../transformers/record";
import { transformWorkflow } from "../transformers/workflow";
import { ironcladFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* ironcladIncrementalSync(
  client: IroncladClient,
  context: IroncladTransformContext,
  options: IroncladSyncOptions = {}
): AsyncGenerator<IroncladSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* ironcladFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Ironclad incremental sync started"
  );

  const lastUpdated = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated workflows", processed);

    for await (const workflows of listWorkflows(client, { lastUpdated })) {
      for (const workflow of workflows) {
        try {
          documents.push(await transformWorkflow(workflow, context));
          processed += 1;

          const approvals = await listApprovals(client, workflow.id);
          for (const approval of approvals) {
            try {
              documents.push(
                await transformApproval(approval, workflow.title, context)
              );
              processed += 1;
            } catch (error) {
              logger.error(
                { error, approvalId: approval.id },
                "Error transforming approval in incremental sync"
              );
              errors += 1;
            }
          }

          const comments = await listComments(client, workflow.id);
          for (const comment of comments) {
            try {
              documents.push(
                await transformComment(comment, workflow.title, context)
              );
              processed += 1;
            } catch (error) {
              logger.error(
                { error, commentId: comment.id },
                "Error transforming comment in incremental sync"
              );
              errors += 1;
            }
          }
        } catch (error) {
          logger.error(
            { error, workflowId: workflow.id },
            "Error transforming workflow in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    await onStageChange?.("Syncing updated records", processed);

    for await (const records of listRecords(client, { lastUpdated })) {
      for (const record of records) {
        try {
          documents.push(await transformRecord(record, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, recordId: record.id },
            "Error transforming record in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    const newCursor: IroncladSyncCursor = {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Ironclad incremental sync failed, falling back to full"
    );
    yield* ironcladFullSync(client, context, options);
  }
}
