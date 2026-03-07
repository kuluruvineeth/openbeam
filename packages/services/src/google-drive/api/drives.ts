import {
  type SharedDrive,
  type SharedDriveListResponse,
  SharedDriveListResponseSchema,
  SharedDriveSchema,
} from "@openbeam/types/services/connectors/google-drive";
import { logger } from "../../lib/logger";
import type { GoogleDriveClient } from "../client";

const DEFAULT_DRIVE_FIELDS = [
  "id",
  "name",
  "colorRgb",
  "backgroundImageLink",
  "capabilities",
  "themeId",
  "createdTime",
  "hidden",
  "restrictions",
  "orgUnitId",
].join(",");

const DEFAULT_LIST_FIELDS = `nextPageToken,drives(${DEFAULT_DRIVE_FIELDS})`;

export interface FetchDrivesOptions {
  pageSize?: number;
  pageToken?: string;
  useDomainAdminAccess?: boolean;
  fields?: string;
}

export interface FetchDriveOptions {
  useDomainAdminAccess?: boolean;
  fields?: string;
}

export async function* fetchSharedDrives(
  client: GoogleDriveClient,
  options: FetchDrivesOptions = {}
): AsyncGenerator<SharedDrive, void, undefined> {
  const {
    pageSize = 100,
    useDomainAdminAccess = false,
    fields = DEFAULT_LIST_FIELDS,
  } = options;

  let pageToken = options.pageToken;

  do {
    const params: Record<string, string | number | boolean | undefined> = {
      pageSize,
      useDomainAdminAccess,
      fields,
      pageToken,
    };

    const response = await client.get<SharedDriveListResponse>(
      "/drives",
      params
    );

    const parsed = SharedDriveListResponseSchema.safeParse(response);
    if (!parsed.success) {
      logger.warn(
        { error: parsed.error.message },
        "Failed to parse shared drives list response, skipping page"
      );
      continue;
    }

    const drives = parsed.data.drives ?? [];
    for (const drive of drives) {
      yield drive;
    }

    pageToken = parsed.data.nextPageToken;
  } while (pageToken);
}

export async function getSharedDrive(
  client: GoogleDriveClient,
  driveId: string,
  options: FetchDriveOptions = {}
): Promise<SharedDrive | null> {
  const { useDomainAdminAccess = false, fields = DEFAULT_DRIVE_FIELDS } =
    options;

  const response = await client.get<SharedDrive>(`/drives/${driveId}`, {
    useDomainAdminAccess,
    fields,
  });

  const parsed = SharedDriveSchema.safeParse(response);
  if (!parsed.success) {
    logger.warn(
      { driveId, error: parsed.error.message },
      "Failed to parse shared drive response"
    );
    return null;
  }
  return parsed.data;
}

export async function listAllSharedDrives(
  client: GoogleDriveClient,
  options: FetchDrivesOptions = {}
): Promise<SharedDrive[]> {
  const drives: SharedDrive[] = [];

  for await (const drive of fetchSharedDrives(client, options)) {
    drives.push(drive);
  }

  return drives;
}

export async function getSharedDriveMembers(
  client: GoogleDriveClient,
  driveId: string
): Promise<
  Array<{
    email: string;
    role: string;
    type: string;
    displayName?: string;
  }>
> {
  const drive = await getSharedDrive(client, driveId);
  if (!drive) {
    return [];
  }

  const rootFile = await client.get<{
    permissions?: Array<{
      id: string;
      type: string;
      role: string;
      emailAddress?: string;
      displayName?: string;
    }>;
  }>(`/files/${driveId}`, {
    fields: "permissions(id,type,role,emailAddress,displayName)",
    supportsAllDrives: true,
  });

  const permissions = rootFile.permissions ?? [];

  return permissions.flatMap((p) =>
    p.emailAddress
      ? [
          {
            email: p.emailAddress,
            role: p.role,
            type: p.type,
            displayName: p.displayName,
          },
        ]
      : []
  );
}
