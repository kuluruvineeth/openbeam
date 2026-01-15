import {
  type DrivePermission,
  DrivePermissionSchema,
} from "@openplane/types/services/connectors/google-drive";
import { z } from "zod";
import type { GoogleDriveClient } from "../client";

const PermissionsListResponseSchema = z.object({
  permissions: z.array(DrivePermissionSchema).optional(),
  nextPageToken: z.string().optional(),
});

export interface ListPermissionsOptions {
  pageSize?: number;
  pageToken?: string;
  supportsAllDrives?: boolean;
  useDomainAdminAccess?: boolean;
}

export interface CreatePermissionOptions {
  type: "user" | "group" | "domain" | "anyone";
  role:
    | "owner"
    | "organizer"
    | "fileOrganizer"
    | "writer"
    | "commenter"
    | "reader";
  emailAddress?: string;
  domain?: string;
  sendNotificationEmail?: boolean;
  emailMessage?: string;
  supportsAllDrives?: boolean;
  useDomainAdminAccess?: boolean;
  transferOwnership?: boolean;
  moveToNewOwnersRoot?: boolean;
}

export interface UpdatePermissionOptions {
  role:
    | "owner"
    | "organizer"
    | "fileOrganizer"
    | "writer"
    | "commenter"
    | "reader";
  supportsAllDrives?: boolean;
  useDomainAdminAccess?: boolean;
  transferOwnership?: boolean;
  removeExpiration?: boolean;
}

export async function* listPermissions(
  client: GoogleDriveClient,
  fileId: string,
  options: ListPermissionsOptions = {}
): AsyncGenerator<DrivePermission, void, undefined> {
  const {
    pageSize = 100,
    supportsAllDrives = true,
    useDomainAdminAccess = false,
  } = options;

  let pageToken = options.pageToken;

  do {
    const params: Record<string, string | number | boolean | undefined> = {
      pageSize,
      supportsAllDrives,
      useDomainAdminAccess,
      fields:
        "permissions(id,type,role,emailAddress,domain,displayName,photoLink,expirationTime,deleted,allowFileDiscovery,pendingOwner),nextPageToken",
      pageToken,
    };

    const response = await client.get<unknown>(
      `/files/${fileId}/permissions`,
      params
    );

    const parsed = PermissionsListResponseSchema.safeParse(response);
    if (!parsed.success) {
      continue;
    }

    const permissions = parsed.data.permissions ?? [];
    for (const permission of permissions) {
      yield permission;
    }

    pageToken = parsed.data.nextPageToken;
  } while (pageToken);
}

export async function getPermission(
  client: GoogleDriveClient,
  fileId: string,
  permissionId: string,
  options: { supportsAllDrives?: boolean; useDomainAdminAccess?: boolean } = {}
): Promise<DrivePermission | null> {
  const { supportsAllDrives = true, useDomainAdminAccess = false } = options;

  const response = await client.get<DrivePermission>(
    `/files/${fileId}/permissions/${permissionId}`,
    {
      supportsAllDrives,
      useDomainAdminAccess,
      fields:
        "id,type,role,emailAddress,domain,displayName,photoLink,expirationTime,deleted,allowFileDiscovery,pendingOwner",
    }
  );

  const parsed = DrivePermissionSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function createPermission(
  client: GoogleDriveClient,
  fileId: string,
  options: CreatePermissionOptions
): Promise<DrivePermission> {
  const {
    type,
    role,
    emailAddress,
    domain,
    sendNotificationEmail = false,
    emailMessage,
    supportsAllDrives = true,
    useDomainAdminAccess = false,
    transferOwnership = false,
    moveToNewOwnersRoot = false,
  } = options;

  const params: Record<string, string | boolean | undefined> = {
    supportsAllDrives: String(supportsAllDrives),
    useDomainAdminAccess: String(useDomainAdminAccess),
    sendNotificationEmail: String(sendNotificationEmail),
    transferOwnership: String(transferOwnership),
    moveToNewOwnersRoot: String(moveToNewOwnersRoot),
  };

  if (emailMessage) {
    params.emailMessage = emailMessage;
  }

  const body: Record<string, string | undefined> = {
    type,
    role,
    emailAddress,
    domain,
  };

  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      searchParams.set(k, String(v));
    }
  }

  const response = await client.post<DrivePermission>(
    `/files/${fileId}/permissions?${searchParams.toString()}`,
    body
  );

  const parsed = DrivePermissionSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid permission response");
  }

  return parsed.data;
}

export async function updatePermission(
  client: GoogleDriveClient,
  fileId: string,
  permissionId: string,
  options: UpdatePermissionOptions
): Promise<DrivePermission> {
  const {
    role,
    supportsAllDrives = true,
    useDomainAdminAccess = false,
    transferOwnership = false,
    removeExpiration = false,
  } = options;

  const params: Record<string, string> = {
    supportsAllDrives: String(supportsAllDrives),
    useDomainAdminAccess: String(useDomainAdminAccess),
    transferOwnership: String(transferOwnership),
    removeExpiration: String(removeExpiration),
  };

  const response = await client.patch<DrivePermission>(
    `/files/${fileId}/permissions/${permissionId}?${new URLSearchParams(params).toString()}`,
    { role }
  );

  const parsed = DrivePermissionSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid permission response");
  }

  return parsed.data;
}

export async function deletePermission(
  client: GoogleDriveClient,
  fileId: string,
  permissionId: string,
  options: { supportsAllDrives?: boolean; useDomainAdminAccess?: boolean } = {}
): Promise<void> {
  const { supportsAllDrives = true, useDomainAdminAccess = false } = options;

  await client.delete(
    `/files/${fileId}/permissions/${permissionId}?supportsAllDrives=${supportsAllDrives}&useDomainAdminAccess=${useDomainAdminAccess}`
  );
}

export async function getAllPermissions(
  client: GoogleDriveClient,
  fileId: string,
  options: ListPermissionsOptions = {}
): Promise<DrivePermission[]> {
  const permissions: DrivePermission[] = [];

  for await (const permission of listPermissions(client, fileId, options)) {
    permissions.push(permission);
  }

  return permissions;
}

export function extractAccessList(permissions: DrivePermission[]): string[] {
  const emails: string[] = [];

  for (const permission of permissions) {
    if (permission.emailAddress && !permission.deleted) {
      emails.push(permission.emailAddress);
    }
  }

  return emails;
}

export function isPubliclyAccessible(permissions: DrivePermission[]): boolean {
  return permissions.some(
    (p) => p.type === "anyone" || (p.type === "domain" && !p.deleted)
  );
}

export function getOwner(
  permissions: DrivePermission[]
): DrivePermission | undefined {
  return permissions.find((p) => p.role === "owner" && !p.deleted);
}
