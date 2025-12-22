import {
  createPermission as apiCreatePermission,
  deletePermission as apiDeletePermission,
  updatePermission as apiUpdatePermission,
  getAllPermissions,
} from "../api/permissions";
import type { GoogleDriveClient } from "../client";

export interface PermissionActionResult {
  success: boolean;
  permissionId?: string;
  error?: string;
}

export interface ShareOptions {
  email: string;
  role: "reader" | "commenter" | "writer";
  sendNotification?: boolean;
  message?: string;
}

export interface ShareWithDomainOptions {
  domain: string;
  role: "reader" | "commenter" | "writer";
}

export interface SharePubliclyOptions {
  role: "reader" | "commenter" | "writer";
  allowFileDiscovery?: boolean;
}

export async function shareWithUser(
  client: GoogleDriveClient,
  fileId: string,
  options: ShareOptions
): Promise<PermissionActionResult> {
  const { email, role, sendNotification = true, message } = options;

  const permission = await apiCreatePermission(client, fileId, {
    type: "user",
    role,
    emailAddress: email,
    sendNotificationEmail: sendNotification,
    emailMessage: message,
  });

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function shareWithGroup(
  client: GoogleDriveClient,
  fileId: string,
  options: ShareOptions
): Promise<PermissionActionResult> {
  const { email, role, sendNotification = true, message } = options;

  const permission = await apiCreatePermission(client, fileId, {
    type: "group",
    role,
    emailAddress: email,
    sendNotificationEmail: sendNotification,
    emailMessage: message,
  });

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function shareWithDomain(
  client: GoogleDriveClient,
  fileId: string,
  options: ShareWithDomainOptions
): Promise<PermissionActionResult> {
  const { domain, role } = options;

  const permission = await apiCreatePermission(client, fileId, {
    type: "domain",
    role,
    domain,
  });

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function sharePublicly(
  client: GoogleDriveClient,
  fileId: string,
  options: SharePubliclyOptions = { role: "reader" }
): Promise<PermissionActionResult> {
  const permission = await apiCreatePermission(client, fileId, {
    type: "anyone",
    role: options.role,
  });

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function removePublicAccess(
  client: GoogleDriveClient,
  fileId: string
): Promise<PermissionActionResult> {
  const permissions = await getAllPermissions(client, fileId);
  const publicPermission = permissions.find((p) => p.type === "anyone");

  if (!publicPermission) {
    return {
      success: true,
    };
  }

  await apiDeletePermission(client, fileId, publicPermission.id);

  return {
    success: true,
    permissionId: publicPermission.id,
  };
}

export async function updateRole(
  client: GoogleDriveClient,
  fileId: string,
  permissionId: string,
  newRole: "reader" | "commenter" | "writer" | "fileOrganizer" | "organizer"
): Promise<PermissionActionResult> {
  const permission = await apiUpdatePermission(client, fileId, permissionId, {
    role: newRole,
  });

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function revokeAccess(
  client: GoogleDriveClient,
  fileId: string,
  permissionId: string
): Promise<PermissionActionResult> {
  await apiDeletePermission(client, fileId, permissionId);

  return {
    success: true,
    permissionId,
  };
}

export async function revokeAccessByEmail(
  client: GoogleDriveClient,
  fileId: string,
  email: string
): Promise<PermissionActionResult> {
  const permissions = await getAllPermissions(client, fileId);
  const permission = permissions.find(
    (p) => p.emailAddress?.toLowerCase() === email.toLowerCase()
  );

  if (!permission) {
    return {
      success: false,
      error: "Permission not found for email",
    };
  }

  await apiDeletePermission(client, fileId, permission.id);

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function transferOwnership(
  client: GoogleDriveClient,
  fileId: string,
  newOwnerEmail: string
): Promise<PermissionActionResult> {
  const permission = await apiCreatePermission(client, fileId, {
    type: "user",
    role: "owner",
    emailAddress: newOwnerEmail,
    transferOwnership: true,
    sendNotificationEmail: true,
  });

  return {
    success: true,
    permissionId: permission.id,
  };
}

export async function getShareableLink(
  client: GoogleDriveClient,
  fileId: string
): Promise<{ url: string; isPublic: boolean }> {
  const permissions = await getAllPermissions(client, fileId);
  const isPublic = permissions.some((p) => p.type === "anyone");

  return {
    url: `https://drive.google.com/file/d/${fileId}/view`,
    isPublic,
  };
}

export async function listSharedUsers(
  client: GoogleDriveClient,
  fileId: string
): Promise<
  Array<{
    email: string;
    role: string;
    type: string;
    displayName?: string;
    permissionId: string;
  }>
> {
  const permissions = await getAllPermissions(client, fileId);

  return permissions.flatMap((p) =>
    p.emailAddress && !p.deleted
      ? [
          {
            email: p.emailAddress,
            role: p.role,
            type: p.type,
            displayName: p.displayName,
            permissionId: p.id,
          },
        ]
      : []
  );
}
