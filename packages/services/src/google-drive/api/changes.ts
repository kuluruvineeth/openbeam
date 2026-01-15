import {
  type DriveChange,
  type DriveChangesListResponse,
  DriveChangesListResponseSchema,
  type DriveStartPageTokenResponse,
  DriveStartPageTokenResponseSchema,
} from "@openplane/types/services/connectors/google-drive";
import type { GoogleDriveClient } from "../client";

const DEFAULT_CHANGE_FIELDS = [
  "nextPageToken",
  "newStartPageToken",
  "changes(fileId,removed,time,changeType,type,file(id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink,webContentLink,iconLink,thumbnailLink,owners,lastModifyingUser,shared,trashed,starred,description,permissions(id,type,role,emailAddress,displayName),capabilities,driveId,fileExtension,md5Checksum,contentHints,imageMediaMetadata,videoMediaMetadata,shortcutDetails),drive(id,name))",
].join(",");

export interface FetchChangesOptions {
  pageToken: string;
  pageSize?: number;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
  includeRemoved?: boolean;
  restrictToMyDrive?: boolean;
  driveId?: string;
  spaces?: string;
  fields?: string;
}

export interface StartPageTokenOptions {
  driveId?: string;
  supportsAllDrives?: boolean;
}

export async function getStartPageToken(
  client: GoogleDriveClient,
  options: StartPageTokenOptions = {}
): Promise<string> {
  const { driveId, supportsAllDrives = true } = options;

  const params: Record<string, string | boolean | undefined> = {
    supportsAllDrives,
  };

  if (driveId) {
    params.driveId = driveId;
  }

  const response = await client.get<DriveStartPageTokenResponse>(
    "/changes/startPageToken",
    params
  );

  const parsed = DriveStartPageTokenResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid startPageToken response");
  }

  return parsed.data.startPageToken;
}

export async function* fetchChanges(
  client: GoogleDriveClient,
  options: FetchChangesOptions
): AsyncGenerator<DriveChange, { newStartPageToken?: string }, undefined> {
  const {
    pageSize = 100,
    includeItemsFromAllDrives = true,
    supportsAllDrives = true,
    includeRemoved = true,
    restrictToMyDrive = false,
    driveId,
    spaces = "drive",
    fields = DEFAULT_CHANGE_FIELDS,
  } = options;

  let pageToken: string | undefined = options.pageToken;
  let newStartPageToken: string | undefined;

  do {
    const params: Record<string, string | number | boolean | undefined> = {
      pageToken,
      pageSize,
      includeItemsFromAllDrives,
      supportsAllDrives,
      includeRemoved,
      restrictToMyDrive,
      spaces,
      fields,
    };

    if (driveId) {
      params.driveId = driveId;
    }

    const response = await client.get<DriveChangesListResponse>(
      "/changes",
      params
    );

    const parsed = DriveChangesListResponseSchema.safeParse(response);
    if (!parsed.success) {
      continue;
    }

    const changes = parsed.data.changes ?? [];
    for (const change of changes) {
      yield change;
    }

    pageToken = parsed.data.nextPageToken;
    newStartPageToken = parsed.data.newStartPageToken;
  } while (pageToken);

  return { newStartPageToken };
}

export async function getChangesSince(
  client: GoogleDriveClient,
  startPageToken: string,
  options: Omit<FetchChangesOptions, "pageToken"> = {}
): Promise<{
  changes: DriveChange[];
  newStartPageToken?: string;
}> {
  const changes: DriveChange[] = [];
  const generator = fetchChanges(client, {
    ...options,
    pageToken: startPageToken,
  });

  let result = await generator.next();
  while (!result.done) {
    changes.push(result.value);
    result = await generator.next();
  }

  return { changes, newStartPageToken: result.value?.newStartPageToken };
}

export function filterFileChanges(changes: DriveChange[]): DriveChange[] {
  return changes.filter((change) => change.type === "file" || !change.type);
}

export function filterDriveChanges(changes: DriveChange[]): DriveChange[] {
  return changes.filter((change) => change.type === "drive");
}

export function partitionChanges(changes: DriveChange[]): {
  added: DriveChange[];
  modified: DriveChange[];
  removed: DriveChange[];
} {
  const added: DriveChange[] = [];
  const modified: DriveChange[] = [];
  const removed: DriveChange[] = [];

  for (const change of changes) {
    if (change.removed) {
      removed.push(change);
    } else if (change.file) {
      const createdTime = change.file.createdTime
        ? new Date(change.file.createdTime).getTime()
        : 0;
      const modifiedTime = change.file.modifiedTime
        ? new Date(change.file.modifiedTime).getTime()
        : 0;

      const isNew = Math.abs(createdTime - modifiedTime) < 1000;
      if (isNew) {
        added.push(change);
      } else {
        modified.push(change);
      }
    }
  }

  return { added, modified, removed };
}
