import type {
  GoogleDriveTransformContext,
  SharedDrive,
} from "@openplane/types/services/connectors/google-drive";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildSharedDriveUrl } from "../utils/content-extractor";

export async function transformSharedDrive(
  drive: SharedDrive,
  context: GoogleDriveTransformContext,
  members: string[] = []
): Promise<GenericDocument> {
  const createdAt = drive.createdTime
    ? new Date(drive.createdTime).getTime()
    : Date.now();

  const metadata = {
    driveId: drive.id,
    ...(drive.colorRgb && { color: drive.colorRgb }),
    ...(drive.themeId && { theme: drive.themeId }),
    ...(drive.hidden && { hidden: true }),
    ...(drive.restrictions && {
      adminManagedRestrictions: drive.restrictions.adminManagedRestrictions,
      copyRequiresWriterPermission:
        drive.restrictions.copyRequiresWriterPermission,
      domainUsersOnly: drive.restrictions.domainUsersOnly,
      driveMembersOnly: drive.restrictions.driveMembersOnly,
    }),
    ...(drive.capabilities && {
      canManageMembers: drive.capabilities.canManageMembers,
      canDeleteDrive: drive.capabilities.canDeleteDrive,
      canRenameDrive: drive.capabilities.canRenameDrive,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title: drive.name,
    content: "",
    metadata,
  });

  return {
    id: buildSharedDriveDocumentId(context.connectorId, drive.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: drive.id,
    document_type: "shared_drive",
    title: drive.name,
    content: "",
    created_at: createdAt,
    updated_at: createdAt,
    source_id: drive.id,
    source_type: "google-drive",
    url: buildSharedDriveUrl(drive.id),
    is_public: false,
    access_control: members,
    contributor_ids: members,
    metadata,
    checksum,
  };
}

function buildSharedDriveDocumentId(
  connectorId: string,
  driveId: string
): string {
  return `${connectorId}_drive_${driveId}`;
}

export function transformSharedDrives(
  drives: SharedDrive[],
  context: GoogleDriveTransformContext,
  membersByDriveId: Map<string, string[]> = new Map()
): Promise<GenericDocument[]> {
  return Promise.all(
    drives.map((drive) =>
      transformSharedDrive(drive, context, membersByDriveId.get(drive.id) ?? [])
    )
  );
}
