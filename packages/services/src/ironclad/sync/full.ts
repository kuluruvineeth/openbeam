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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* ironcladFullSync(
  client: IroncladClient,
  context: IroncladTransformContext,
  options: IroncladSyncOptions = {}
): AsyncGenerator<IroncladSyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  logger.info(
    { connectorId: client.connectorId },
    "Ironclad full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: IroncladSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing workflows", state.processed);

  for await (const workflows of listWorkflows(client)) {
    for (const workflow of workflows) {
      try {
        state.documents.push(await transformWorkflow(workflow, context));
        state.processed += 1;

        const approvals = await listApprovals(client, workflow.id);
        for (const approval of approvals) {
          try {
            state.documents.push(
              await transformApproval(approval, workflow.title, context)
            );
            state.processed += 1;
          } catch (error) {
            logger.error(
              { error, approvalId: approval.id },
              "Error transforming Ironclad approval"
            );
            state.errors += 1;
          }
        }

        const comments = await listComments(client, workflow.id);
        for (const comment of comments) {
          try {
            state.documents.push(
              await transformComment(comment, workflow.title, context)
            );
            state.processed += 1;
          } catch (error) {
            logger.error(
              { error, commentId: comment.id },
              "Error transforming Ironclad comment"
            );
            state.errors += 1;
          }
        }
      } catch (error) {
        logger.error(
          { error, workflowId: workflow.id },
          "Error transforming Ironclad workflow"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing records", state.processed);

  for await (const records of listRecords(client)) {
    for (const record of records) {
      try {
        state.documents.push(await transformRecord(record, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, recordId: record.id },
          "Error transforming Ironclad record"
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
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Ironclad full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
