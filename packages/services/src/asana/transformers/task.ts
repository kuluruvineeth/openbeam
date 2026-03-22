import type { AsanaTransformContext } from "@openbeam/types/services/connectors/asana";
import type { GenericDocument } from "@openbeam/vespa";
import type { AsanaTask } from "../api/tasks";
import { stripHtml } from "./utils";

export function transformAsanaTask(
  task: AsanaTask,
  context: AsanaTransformContext
): GenericDocument {
  const content = task.html_notes
    ? stripHtml(task.html_notes)
    : (task.notes ?? "");

  const createdAt = new Date(task.created_at).getTime();
  const updatedAt = new Date(task.modified_at).getTime();

  const tags = task.tags?.map((t) => t.name) ?? [];
  const projects = task.projects?.map((p) => p.name) ?? [];
  const customFieldValues = task.custom_fields
    ?.filter((f) => f.display_value)
    .map((f) => `${f.name}: ${f.display_value}`)
    .join(", ");

  const sectionName = task.memberships?.[0]?.section?.name;

  return {
    id: `${context.connectorId}_task_${task.gid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: task.gid,
    document_type: "task",
    document_subtype: task.completed ? "completed" : "active",
    title: task.name,
    content,
    author_name: task.assignee?.name,
    created_at: createdAt,
    updated_at: updatedAt,
    url: task.permalink_url,
    is_public: false,
    access_control: [],
    metadata: {
      completed: String(task.completed),
      ...(task.assignee && { assignee: task.assignee.name }),
      ...(task.due_on && { dueDate: task.due_on }),
      ...(sectionName && { section: sectionName }),
      ...(tags.length > 0 && { tags: tags.join(", ") }),
      ...(projects.length > 0 && { projects: projects.join(", ") }),
      ...(customFieldValues && { customFields: customFieldValues }),
      ...(task.parent && { parentTask: task.parent.name }),
    },
  };
}
