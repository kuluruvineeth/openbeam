import {
  copyFile,
  createFile,
  deleteFile,
  moveFile,
  renameFile,
  trashFile,
  untrashFile,
} from "../../google-drive/actions/files";
import {
  createFolder,
  deleteFolder,
  moveFolder,
  renameFolder,
  trashFolder,
} from "../../google-drive/actions/folders";
import {
  revokeAccess,
  shareWithUser,
  transferOwnership,
  updateRole,
} from "../../google-drive/actions/permissions";
import {
  createGoogleDriveClient,
  type GoogleDriveClient,
} from "../../google-drive/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: GoogleDriveClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function strArr(p: Record<string, unknown>, key: string): string[] {
  const v = p[key];
  if (Array.isArray(v)) {
    return v as string[];
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async file_create(client, p) {
    const r = await createFile(client, {
      name: str(p, "name"),
      mimeType: typeof p.mimeType === "string" ? p.mimeType : undefined,
      parents: Array.isArray(p.parents) ? (p.parents as string[]) : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    return { success: r.success, data: { fileId: r.fileId }, error: r.error };
  },

  async file_copy(client, p) {
    const r = await copyFile(client, str(p, "fileId"), {
      name: typeof p.name === "string" ? p.name : undefined,
      parents: Array.isArray(p.parents) ? (p.parents as string[]) : undefined,
    });
    return { success: r.success, data: { fileId: r.fileId }, error: r.error };
  },

  async file_move(client, p) {
    const r = await moveFile(client, str(p, "fileId"), {
      addParents: strArr(p, "addParents"),
      removeParents: strArr(p, "removeParents"),
    });
    return { success: r.success, data: { fileId: r.fileId }, error: r.error };
  },

  async file_rename(client, p) {
    const r = await renameFile(client, str(p, "fileId"), str(p, "newName"));
    return { success: r.success, data: { fileId: r.fileId }, error: r.error };
  },

  async file_trash(client, p) {
    const r = await trashFile(client, str(p, "fileId"));
    return { success: r.success, data: { trashed: true }, error: r.error };
  },

  async file_untrash(client, p) {
    const r = await untrashFile(client, str(p, "fileId"));
    return { success: r.success, data: { untrashed: true }, error: r.error };
  },

  async file_delete(client, p) {
    const r = await deleteFile(client, str(p, "fileId"));
    return { success: r.success, data: { deleted: true }, error: r.error };
  },

  async folder_create(client, p) {
    const r = await createFolder(client, {
      name: str(p, "name"),
      parents: Array.isArray(p.parents) ? (p.parents as string[]) : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    return {
      success: r.success,
      data: { folderId: r.folderId },
      error: r.error,
    };
  },

  async folder_rename(client, p) {
    const r = await renameFolder(client, str(p, "folderId"), str(p, "newName"));
    return {
      success: r.success,
      data: { folderId: r.folderId },
      error: r.error,
    };
  },

  async folder_move(client, p) {
    const r = await moveFolder(client, str(p, "folderId"), {
      addParents: strArr(p, "addParents"),
      removeParents: strArr(p, "removeParents"),
    });
    return {
      success: r.success,
      data: { folderId: r.folderId },
      error: r.error,
    };
  },

  async folder_trash(client, p) {
    const r = await trashFolder(client, str(p, "folderId"));
    return { success: r.success, data: { trashed: true }, error: r.error };
  },

  async folder_delete(client, p) {
    const r = await deleteFolder(client, str(p, "folderId"));
    return { success: r.success, data: { deleted: true }, error: r.error };
  },

  async permission_share(client, p) {
    const r = await shareWithUser(client, str(p, "fileId"), {
      email: str(p, "email"),
      role: str(p, "role") as "reader" | "commenter" | "writer",
      sendNotification: p.sendNotification !== false,
    });
    return {
      success: r.success,
      data: { permissionId: r.permissionId },
      error: r.error,
    };
  },

  async permission_update(client, p) {
    const r = await updateRole(
      client,
      str(p, "fileId"),
      str(p, "permissionId"),
      str(p, "role") as "reader" | "commenter" | "writer"
    );
    return {
      success: r.success,
      data: { permissionId: r.permissionId },
      error: r.error,
    };
  },

  async permission_revoke(client, p) {
    const r = await revokeAccess(
      client,
      str(p, "fileId"),
      str(p, "permissionId")
    );
    return { success: r.success, data: { revoked: true }, error: r.error };
  },

  async permission_transfer_ownership(client, p) {
    const r = await transferOwnership(
      client,
      str(p, "fileId"),
      str(p, "newOwnerEmail")
    );
    return {
      success: r.success,
      data: { permissionId: r.permissionId },
      error: r.error,
    };
  },
};

registerHandler({
  connectorType: "google-drive",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Google Drive action: ${actionId}`,
      };
    }

    const client = createGoogleDriveClient({
      connectorId,
      accessToken: credentials.accessToken || undefined,
      userEmail:
        typeof credentials.config.userEmail === "string"
          ? credentials.config.userEmail
          : undefined,
    });

    return await handler(client, params);
  },
});
