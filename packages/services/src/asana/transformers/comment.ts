import type { AsanaTransformContext } from "@openbeam/types/services/connectors/asana";
import type { GenericDocument } from "@openbeam/vespa";
import type { AsanaStory } from "../api/stories";
import type { AsanaTask } from "../api/tasks";
import { stripHtml } from "./utils";

export function transformAsanaComment(
  story: AsanaStory,
  task: AsanaTask,
  context: AsanaTransformContext
): GenericDocument {
  const content = story.html_text ? stripHtml(story.html_text) : story.text;

  const createdAt = new Date(story.created_at).getTime();

  return {
    id: `${context.connectorId}_comment_${story.gid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: story.gid,
    document_type: "comment",
    document_subtype: "task_comment",
    title: `Comment on ${task.name}`,
    content,
    author_name: story.created_by.name,
    author_id: story.created_by.gid,
    created_at: createdAt,
    updated_at: createdAt,
    source_id: task.gid,
    source_type: "task",
    thread_id: task.gid,
    url: task.permalink_url,
    is_public: false,
    access_control: [],
    metadata: {
      taskGid: task.gid,
      taskName: task.name,
      ...(task.projects?.[0] && { projectName: task.projects[0].name }),
    },
  };
}
