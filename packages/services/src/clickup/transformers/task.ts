import type {
  ClickUpComment,
  ClickUpTask,
  ClickUpTransformContext,
} from "@openbeam/types/services/connectors/clickup";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildTaskDocumentId(connectorId: string, taskId: string): string {
  return `${connectorId}_task_${taskId}`;
}

function buildTaskContent(
  task: ClickUpTask,
  comments?: ClickUpComment[]
): string {
  const parts: string[] = [];

  if (task.text_content) {
    parts.push(task.text_content);
  } else if (task.description) {
    parts.push(task.description);
  }

  parts.push(`Status: ${task.status.status}`);

  if (task.priority) {
    parts.push(`Priority: ${task.priority.priority}`);
  }

  if (task.assignees.length > 0) {
    const names = task.assignees
      .map((a) => a.username ?? a.email ?? String(a.id))
      .join(", ");
    parts.push(`Assignees: ${names}`);
  }

  if (task.tags.length > 0) {
    parts.push(`Tags: ${task.tags.map((t) => t.name).join(", ")}`);
  }

  if (task.list?.name) {
    parts.push(`List: ${task.list.name}`);
  }

  if (task.due_date) {
    parts.push(`Due: ${new Date(Number(task.due_date)).toISOString()}`);
  }

  if (task.custom_fields?.length) {
    for (const field of task.custom_fields) {
      if (field.value !== null && field.value !== undefined) {
        parts.push(`${field.name}: ${String(field.value)}`);
      }
    }
  }

  if (comments?.length) {
    parts.push("\n--- Comments ---");
    for (const comment of comments) {
      const author =
        comment.user.username ?? comment.user.email ?? String(comment.user.id);
      parts.push(`${author}: ${comment.comment_text}`);
    }
  }

  return parts.join("\n");
}

function buildTaskMetadata(
  task: ClickUpTask,
  comments?: ClickUpComment[]
): GenericDocument["metadata"] {
  return {
    taskId: task.id,
    statusName: task.status.status,
    statusColor: task.status.color,
    statusType: task.status.type,
    archived: task.archived,
    ...(task.priority && {
      priorityId: task.priority.id,
      priorityLabel: task.priority.priority,
    }),
    ...(task.tags.length > 0 && {
      tags: JSON.stringify(task.tags.map((t) => t.name)),
    }),
    ...(task.assignees.length > 0 && {
      assigneeIds: JSON.stringify(task.assignees.map((a) => String(a.id))),
    }),
    ...(task.list && { listId: task.list.id, listName: task.list.name }),
    ...(task.folder && {
      folderId: task.folder.id,
      folderName: task.folder.name,
    }),
    ...(task.space && { spaceId: task.space.id }),
    ...(task.due_date && { dueDate: task.due_date }),
    ...(task.start_date && { startDate: task.start_date }),
    ...(task.date_closed && { closedAt: task.date_closed }),
    ...(task.parent && { parentId: task.parent }),
    ...(task.points !== null &&
      task.points !== undefined && { points: task.points }),
    ...(task.time_estimate && { timeEstimate: task.time_estimate }),
    ...(task.time_spent && { timeSpent: task.time_spent }),
    ...(comments && { commentCount: comments.length }),
  };
}

export async function transformTask(
  task: ClickUpTask,
  context: ClickUpTransformContext,
  comments?: ClickUpComment[]
): Promise<GenericDocument> {
  const content = buildTaskContent(task, comments);
  const metadata = buildTaskMetadata(task, comments);

  const checksum = await calculateDocumentChecksum({
    title: task.name,
    content,
    metadata,
  });

  const creatorName =
    task.creator.username ?? task.creator.email ?? String(task.creator.id);

  return {
    id: buildTaskDocumentId(context.connectorId, task.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: task.id,
    document_type: "task",
    document_subtype: task.status.type,
    title: task.name,
    content,
    author_id: String(task.creator.id),
    author_name: creatorName,
    author_avatar_url: task.creator.profilePicture ?? undefined,
    created_at: Number(task.date_created),
    updated_at: Number(task.date_updated),
    source_id: task.list?.id ?? task.space?.id ?? context.workspaceId,
    source_type: "clickup",
    source_name: context.workspaceName,
    url: task.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
