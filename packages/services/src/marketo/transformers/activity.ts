import type { MarketoTransformContext } from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import type { MarketoActivity, MarketoActivityType } from "../api/activities";
import { buildMarketoUrl } from "./utils";

export function transformMarketoActivity(
  activity: MarketoActivity,
  activityTypes: Map<number, MarketoActivityType>,
  context: MarketoTransformContext
): GenericDocument {
  const activityType = activityTypes.get(activity.activityTypeId);
  const typeName =
    activityType?.name ?? `Activity Type ${activity.activityTypeId}`;

  const parts = [
    activity.primaryAttributeValue
      ? `Primary: ${activity.primaryAttributeValue}`
      : null,
    `Lead ID: ${activity.leadId}`,
  ];

  if (activity.attributes) {
    for (const attr of activity.attributes) {
      parts.push(`${attr.name}: ${attr.value}`);
    }
  }

  const content = parts.filter(Boolean).join(" — ");
  const activityDate = new Date(activity.activityDate).getTime();

  return {
    id: `${context.connectorId}_activity_${activity.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(activity.id),
    document_type: "activity",
    document_subtype: typeName,
    title: `${typeName}: ${activity.primaryAttributeValue ?? `Lead ${activity.leadId}`}`,
    content,
    created_at: activityDate,
    updated_at: activityDate,
    url: buildMarketoUrl(context.munchkinId, "LE", activity.leadId),
    is_public: false,
    access_control: [],
    metadata: {
      activityTypeId: String(activity.activityTypeId),
      activityTypeName: typeName,
      leadId: String(activity.leadId),
      ...(activity.primaryAttributeValue && {
        primaryAttribute: activity.primaryAttributeValue,
      }),
    },
  };
}
