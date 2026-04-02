import { logger } from "../../lib/logger";
import type { AzureDevOpsClient } from "../client";

type ActionResult = {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
};

type WorkItemPatchOperation = {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;
};

export async function createWorkItem(
  client: AzureDevOpsClient,
  project: string,
  workItemType: string,
  fields: {
    title: string;
    description?: string;
    assignedTo?: string;
    priority?: number;
    tags?: string;
  }
): Promise<ActionResult> {
  try {
    const operations: WorkItemPatchOperation[] = [
      { op: "add", path: "/fields/System.Title", value: fields.title },
    ];

    if (fields.description) {
      operations.push({
        op: "add",
        path: "/fields/System.Description",
        value: fields.description,
      });
    }

    if (fields.assignedTo) {
      operations.push({
        op: "add",
        path: "/fields/System.AssignedTo",
        value: fields.assignedTo,
      });
    }

    if (fields.priority !== undefined) {
      operations.push({
        op: "add",
        path: "/fields/Microsoft.VSTS.Common.Priority",
        value: fields.priority,
      });
    }

    if (fields.tags) {
      operations.push({
        op: "add",
        path: "/fields/System.Tags",
        value: fields.tags,
      });
    }

    const result = await client.post<{ id: number; url: string }>(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}`,
      operations
    );

    return {
      success: true,
      id: String(result.id),
      url: `https://dev.azure.com/${client.organization}/${encodeURIComponent(project)}/_workitems/edit/${result.id}`,
    };
  } catch (error) {
    logger.error(
      { error, project, workItemType },
      "Failed to create work item"
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateWorkItem(
  client: AzureDevOpsClient,
  project: string,
  workItemId: number,
  fields: {
    title?: string;
    description?: string;
    assignedTo?: string;
    state?: string;
    priority?: number;
    tags?: string;
  }
): Promise<ActionResult> {
  try {
    const operations: WorkItemPatchOperation[] = [];

    if (fields.title) {
      operations.push({
        op: "replace",
        path: "/fields/System.Title",
        value: fields.title,
      });
    }

    if (fields.description !== undefined) {
      operations.push({
        op: "replace",
        path: "/fields/System.Description",
        value: fields.description,
      });
    }

    if (fields.assignedTo) {
      operations.push({
        op: "replace",
        path: "/fields/System.AssignedTo",
        value: fields.assignedTo,
      });
    }

    if (fields.state) {
      operations.push({
        op: "replace",
        path: "/fields/System.State",
        value: fields.state,
      });
    }

    if (fields.priority !== undefined) {
      operations.push({
        op: "replace",
        path: "/fields/Microsoft.VSTS.Common.Priority",
        value: fields.priority,
      });
    }

    if (fields.tags !== undefined) {
      operations.push({
        op: "replace",
        path: "/fields/System.Tags",
        value: fields.tags,
      });
    }

    if (operations.length === 0) {
      return { success: true, id: String(workItemId) };
    }

    await client.patch(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}`,
      operations
    );

    return {
      success: true,
      id: String(workItemId),
      url: `https://dev.azure.com/${client.organization}/${encodeURIComponent(project)}/_workitems/edit/${workItemId}`,
    };
  } catch (error) {
    logger.error({ error, workItemId }, "Failed to update work item");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function addWorkItemComment(
  client: AzureDevOpsClient,
  project: string,
  workItemId: number,
  text: string
): Promise<ActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}/comments`,
      { text }
    );

    return { success: true, id: String(result.id) };
  } catch (error) {
    logger.error({ error, workItemId }, "Failed to add work item comment");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
