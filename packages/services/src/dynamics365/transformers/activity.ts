import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import type { Dynamics365Activity } from "../api/activities";
import { buildDynamics365Url } from "./utils";

const ACTIVITY_STATE_MAP: Record<number, string> = {
  0: "Open",
  1: "Completed",
  2: "Cancelled",
  3: "Scheduled",
};

export function transformDynamics365Activity(
  activity: Dynamics365Activity,
  context: Dynamics365TransformContext
): GenericDocument {
  const regardingName = (activity as Record<string, unknown>)[
    "_regardingobjectid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;
  const ownerName = (activity as Record<string, unknown>)[
    "_ownerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;

  const state = ACTIVITY_STATE_MAP[activity.statecode] ?? "Unknown";

  const parts = [
    `Type: ${activity.activitytypecode}`,
    `Status: ${state}`,
    regardingName ? `Regarding: ${regardingName}` : null,
    activity.scheduledstart ? `Scheduled: ${activity.scheduledstart}` : null,
    activity.description,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(activity.createdon).getTime();
  const updatedAt = new Date(activity.modifiedon).getTime();

  return {
    id: `${context.connectorId}_activity_${activity.activityid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: activity.activityid,
    document_type: "event",
    document_subtype: activity.activitytypecode,
    title: activity.subject ?? `${activity.activitytypecode} activity`,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDynamics365Url(
      context.orgUrl,
      "activitypointer",
      activity.activityid
    ),
    author_name: ownerName,
    is_public: false,
    access_control: [],
    metadata: {
      activityType: activity.activitytypecode,
      status: state,
      ...(regardingName && { regardingName }),
      ...(activity.scheduledstart && {
        scheduledStart: activity.scheduledstart,
      }),
      ...(activity.scheduledend && { scheduledEnd: activity.scheduledend }),
    },
  };
}
