import type { PipedriveTransformContext } from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import type { PipedriveActivity } from "../api/activities";
import { buildPipedriveUrl, stripHtml } from "./utils";

export function transformPipedriveActivity(
  activity: PipedriveActivity,
  context: PipedriveTransformContext
): GenericDocument {
  const parts = [
    activity.type ? `Type: ${activity.type}` : null,
    activity.due_date ? `Due: ${activity.due_date}` : null,
    activity.done ? "Done" : "Pending",
    activity.note ? stripHtml(activity.note) : null,
    activity.location ? `Location: ${activity.location}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(activity.add_time).getTime();
  const updatedAt = new Date(activity.update_time).getTime();

  return {
    id: `${context.connectorId}_activity_${activity.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(activity.id),
    document_type: "activity",
    document_subtype: activity.type,
    title: activity.subject,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildPipedriveUrl(context.companyDomain, "activities", activity.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(activity.type && { activityType: activity.type }),
      ...(activity.due_date && { dueDate: activity.due_date }),
      ...(activity.deal_id && { dealId: String(activity.deal_id) }),
      ...(activity.person_id && { personId: String(activity.person_id) }),
      ...(activity.org_id && { orgId: String(activity.org_id) }),
      done: String(activity.done),
    },
  };
}
