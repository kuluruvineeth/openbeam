import type { AzureDevOpsTransformContext } from "@openbeam/types/services/connectors/azure-devops";
import type { GenericDocument } from "@openbeam/vespa";
import type { AzureDevOpsWorkItem } from "../api/work-items";
import { priorityLabel, stripHtml } from "./utils";

export function transformWorkItem(
  item: AzureDevOpsWorkItem,
  context: AzureDevOpsTransformContext
): GenericDocument {
  const fields = item.fields;
  const description = fields["System.Description"]
    ? stripHtml(fields["System.Description"])
    : "";

  const createdAt = new Date(fields["System.CreatedDate"]).getTime();
  const updatedAt = new Date(fields["System.ChangedDate"]).getTime();
  const assignee = fields["System.AssignedTo"];
  const creator = fields["System.CreatedBy"];
  const workItemType = fields["System.WorkItemType"];
  const tags = fields["System.Tags"];
  const priority = fields["Microsoft.VSTS.Common.Priority"];
  const project = fields["System.TeamProject"] ?? "";

  return {
    id: `${context.connectorId}_work_item_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(item.id),
    document_type: "work_item",
    document_subtype: workItemType.toLowerCase().replace(/\s+/g, "_"),
    title: `[${item.id}] ${fields["System.Title"]}`,
    content: description,
    author_id: creator?.id,
    author_name: creator?.displayName,
    author_email: creator?.uniqueName,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.baseUrl}/${encodeURIComponent(project)}/_workitems/edit/${item.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      workItemType,
      state: fields["System.State"],
      ...(priority !== undefined && {
        priority: priorityLabel(priority) ?? String(priority),
      }),
      ...(assignee && { assignee: assignee.displayName }),
      ...(project && { project }),
      ...(fields["System.AreaPath"] && { areaPath: fields["System.AreaPath"] }),
      ...(fields["System.IterationPath"] && {
        iterationPath: fields["System.IterationPath"],
      }),
      ...(tags && { tags }),
      ...(fields["System.Reason"] && { reason: fields["System.Reason"] }),
    },
  };
}
