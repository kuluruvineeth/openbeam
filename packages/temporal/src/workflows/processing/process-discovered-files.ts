import { executeChild, proxyActivities } from "@temporalio/workflow";
import type {
  DatabaseActivities,
  FileResourceRecord,
} from "../../activities/database/types";
import { TASK_QUEUES } from "../../config";
import { generateWorkflowId } from "../../utils/workflow-id";
import { fileProcessingWorkflow } from "./file-processing";
import { mediaProcessingWorkflow } from "./media-processing";

const databaseActivities = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "2m",
  retry: { maximumAttempts: 3 },
});

const MEDIA_RESOURCE_TYPES = new Set(["video", "audio"]);
const MAX_CONCURRENT_FILES = 5;

interface ProcessDiscoveredFilesInput {
  connectorId: string;
}

interface ProcessDiscoveredFilesOutput {
  filesProcessed: number;
  mediaProcessed: number;
  errors: number;
}

function canRouteToMediaWorkflow(resource: FileResourceRecord): boolean {
  return (
    MEDIA_RESOURCE_TYPES.has(resource.resourceType) && !!resource.downloadUrl
  );
}

function buildFileMetadata(
  resource: FileResourceRecord
): Record<string, string> {
  const result: Record<string, string> = {};

  if (resource.downloadUrl) {
    result.downloadUrl = resource.downloadUrl;
  }
  result.filename = resource.name;

  const meta = resource.metadata;
  if (typeof meta.messageId === "string") {
    result.messageId = meta.messageId;
  }
  if (typeof meta.attachmentId === "string") {
    result.attachmentId = meta.attachmentId;
  }
  if (typeof meta.threadId === "string") {
    result.threadId = meta.threadId;
  }
  if (typeof meta.sourceChannelId === "string") {
    result.sourceChannelId = meta.sourceChannelId;
  }

  return result;
}

export async function processDiscoveredFilesWorkflow(
  input: ProcessDiscoveredFilesInput
): Promise<ProcessDiscoveredFilesOutput> {
  const resources = await databaseActivities.getFileResources({
    connectorId: input.connectorId,
  });

  if (resources.length === 0) {
    return { filesProcessed: 0, mediaProcessed: 0, errors: 0 };
  }

  let filesProcessed = 0;
  let mediaProcessed = 0;
  let errors = 0;

  for (let i = 0; i < resources.length; i += MAX_CONCURRENT_FILES) {
    const batch = resources.slice(i, i + MAX_CONCURRENT_FILES);

    const results = await Promise.allSettled(
      batch.map((resource) => {
        if (canRouteToMediaWorkflow(resource)) {
          return executeChild(mediaProcessingWorkflow, {
            taskQueue: TASK_QUEUES.MEDIA_PROCESSING,
            workflowId: generateWorkflowId({
              type: "media",
              documentId: resource.externalId,
            }),
            args: [
              {
                connectorId: input.connectorId,
                mediaId: resource.externalId,
                mediaType: resource.resourceType as "video" | "audio",
                sourceUrl: resource.downloadUrl,
              },
            ],
          });
        }

        return executeChild(fileProcessingWorkflow, {
          taskQueue: TASK_QUEUES.FILE_PROCESSING,
          workflowId: generateWorkflowId({
            type: "file",
            documentId: resource.externalId,
          }),
          args: [
            {
              connectorId: input.connectorId,
              externalId: resource.externalId,
              mimeType: resource.mimeType,
              downloadUrl: resource.downloadUrl,
              metadata: buildFileMetadata(resource),
            },
          ],
        });
      })
    );

    for (const [idx, result] of results.entries()) {
      const resource = batch[idx];
      if (result.status === "rejected") {
        errors += 1;
      } else if (resource && canRouteToMediaWorkflow(resource)) {
        mediaProcessed += 1;
      } else {
        filesProcessed += 1;
      }
    }
  }

  return { filesProcessed, mediaProcessed, errors };
}
