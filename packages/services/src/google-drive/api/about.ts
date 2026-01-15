import {
  type DriveAbout,
  DriveAboutSchema,
} from "@openplane/types/services/connectors/google-drive";
import type { GoogleDriveClient } from "../client";

const DEFAULT_ABOUT_FIELDS = [
  "user(displayName,emailAddress,photoLink,permissionId)",
  "storageQuota(limit,usage,usageInDrive,usageInDriveTrash)",
  "canCreateDrives",
  "maxUploadSize",
  "appInstalled",
  "exportFormats",
  "importFormats",
].join(",");

export async function getAbout(
  client: GoogleDriveClient,
  fields = DEFAULT_ABOUT_FIELDS
): Promise<DriveAbout | null> {
  const response = await client.get<DriveAbout>("/about", { fields });

  const parsed = DriveAboutSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function getUserInfo(client: GoogleDriveClient): Promise<{
  email: string;
  name?: string;
  photoLink?: string;
  permissionId?: string;
} | null> {
  const about = await getAbout(
    client,
    "user(displayName,emailAddress,photoLink,permissionId)"
  );

  if (!about?.user?.emailAddress) {
    return null;
  }

  return {
    email: about.user.emailAddress,
    name: about.user.displayName,
    photoLink: about.user.photoLink,
    permissionId: about.user.permissionId,
  };
}

export async function getStorageQuota(client: GoogleDriveClient): Promise<{
  limit?: number;
  usage?: number;
  usageInDrive?: number;
  usageInDriveTrash?: number;
  percentUsed?: number;
} | null> {
  const about = await getAbout(
    client,
    "storageQuota(limit,usage,usageInDrive,usageInDriveTrash)"
  );

  if (!about?.storageQuota) {
    return null;
  }

  const quota = about.storageQuota;
  const limit = quota.limit ? Number.parseInt(quota.limit, 10) : undefined;
  const usage = quota.usage ? Number.parseInt(quota.usage, 10) : undefined;
  const usageInDrive = quota.usageInDrive
    ? Number.parseInt(quota.usageInDrive, 10)
    : undefined;
  const usageInDriveTrash = quota.usageInDriveTrash
    ? Number.parseInt(quota.usageInDriveTrash, 10)
    : undefined;

  const percentUsed =
    limit && usage ? Math.round((usage / limit) * 100) : undefined;

  return {
    limit,
    usage,
    usageInDrive,
    usageInDriveTrash,
    percentUsed,
  };
}

export async function getExportFormats(
  client: GoogleDriveClient
): Promise<Record<string, string[]>> {
  const about = await getAbout(client, "exportFormats");
  return (about?.exportFormats as Record<string, string[]>) ?? {};
}

export async function getImportFormats(
  client: GoogleDriveClient
): Promise<Record<string, string[]>> {
  const about = await getAbout(client, "importFormats");
  return (about?.importFormats as Record<string, string[]>) ?? {};
}
