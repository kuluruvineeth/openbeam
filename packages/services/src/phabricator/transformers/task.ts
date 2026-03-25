import type { PhabricatorTransformContext } from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { PhabricatorTask } from "../api/tasks";
import { buildPhabricatorUrl, remarkupToPlainText } from "./utils";

function buildTaskContent(task: PhabricatorTask): string {
  const parts: string[] = [];

  if (task.fields.description?.raw) {
    parts.push(remarkupToPlainText(task.fields.description.raw));
  }

  parts.push(`Status: ${task.fields.status.name}`);
  parts.push(`Priority: ${task.fields.priority.name}`);

  if (task.fields.points !== null) {
    parts.push(`Points: ${task.fields.points}`);
  }

  return parts.join("\n");
}

export async function transformTask(
  task: PhabricatorTask,
  context: PhabricatorTransformContext
): Promise<GenericDocument> {
  const title = task.fields.name;
  const content = buildTaskContent(task);
  const url = buildPhabricatorUrl(context.instanceUrl, `/T${task.id}`);

  const metadata: GenericDocument["metadata"] = {
    taskId: String(task.id),
    phid: task.phid,
    status: task.fields.status.name,
    statusValue: task.fields.status.value,
    priority: task.fields.priority.name,
    priorityValue: String(task.fields.priority.value),
    subtype: task.fields.subtype,
    ...(task.fields.points !== null && {
      points: String(task.fields.points),
    }),
    ...(task.attachments.projects?.projectPHIDs.length && {
      projectPhids: task.attachments.projects.projectPHIDs.join(", "),
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_task_${task.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(task.id),
    document_type: "task",
    document_subtype: task.fields.status.name,
    title,
    content,
    created_at: task.fields.dateCreated * 1000,
    updated_at: task.fields.dateModified * 1000,
    source_type: "phabricator",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
