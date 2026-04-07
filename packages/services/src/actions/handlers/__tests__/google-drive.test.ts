import { beforeEach, describe, expect, it, mock } from "bun:test";

const createFileMock = mock(
  (): Promise<{ success: boolean; fileId?: string; error?: string }> =>
    Promise.resolve({ success: true, fileId: "f1" })
);
const copyFileMock = mock(() =>
  Promise.resolve({ success: true, fileId: "f2" })
);
const moveFileMock = mock(() =>
  Promise.resolve({ success: true, fileId: "f1" })
);
const renameFileMock = mock(() =>
  Promise.resolve({ success: true, fileId: "f1" })
);
const trashFileMock = mock(() => Promise.resolve({ success: true }));
const untrashFileMock = mock(() => Promise.resolve({ success: true }));
const deleteFileMock = mock(() => Promise.resolve({ success: true }));

const createFolderMock = mock(() =>
  Promise.resolve({ success: true, folderId: "fo1" })
);
const renameFolderMock = mock(() =>
  Promise.resolve({ success: true, folderId: "fo1" })
);
const moveFolderMock = mock(() =>
  Promise.resolve({ success: true, folderId: "fo1" })
);
const trashFolderMock = mock(() => Promise.resolve({ success: true }));
const deleteFolderMock = mock(() => Promise.resolve({ success: true }));

const shareWithUserMock = mock(() =>
  Promise.resolve({ success: true, permissionId: "perm1" })
);
const updateRoleMock = mock(() =>
  Promise.resolve({ success: true, permissionId: "perm1" })
);
const revokeAccessMock = mock(() => Promise.resolve({ success: true }));
const transferOwnershipMock = mock(() =>
  Promise.resolve({ success: true, permissionId: "perm2" })
);

type DriveFileObj = { id: string; name: string; mimeType: string } | null;

const getFileMock = mock(
  (): Promise<DriveFileObj> =>
    Promise.resolve({ id: "f1", name: "doc.txt", mimeType: "text/plain" })
);
const searchFilesMock = mock(() =>
  Promise.resolve([
    { id: "f1", name: "doc.txt", mimeType: "text/plain" },
    { id: "f2", name: "sheet.xlsx", mimeType: "application/vnd.ms-excel" },
  ])
);

mock.module("../../../google-drive/actions/files", () => ({
  createFile: createFileMock,
  copyFile: copyFileMock,
  moveFile: moveFileMock,
  renameFile: renameFileMock,
  trashFile: trashFileMock,
  untrashFile: untrashFileMock,
  deleteFile: deleteFileMock,
}));

mock.module("../../../google-drive/actions/folders", () => ({
  createFolder: createFolderMock,
  renameFolder: renameFolderMock,
  moveFolder: moveFolderMock,
  trashFolder: trashFolderMock,
  deleteFolder: deleteFolderMock,
}));

mock.module("../../../google-drive/api/files", () => ({
  getFile: getFileMock,
  searchFiles: searchFilesMock,
}));

mock.module("../../../google-drive/actions/permissions", () => ({
  shareWithUser: shareWithUserMock,
  updateRole: updateRoleMock,
  revokeAccess: revokeAccessMock,
  transferOwnership: transferOwnershipMock,
}));

mock.module("../../../google-drive/client", () => ({
  createGoogleDriveClient: () => ({}),
}));

import { getHandler } from "../../handler-registry";
import "../google-drive";

const handler = getHandler("google-drive");

const credentials = {
  accessToken: "ya29.token",
  config: { userEmail: "me@co.com" },
};

function run(actionId: string, params: Record<string, unknown>) {
  if (!handler) {
    throw new Error("google-drive handler not registered");
  }
  return handler.execute(actionId, params, credentials, "conn_1");
}

const allMocks = [
  getFileMock,
  searchFilesMock,
  createFileMock,
  copyFileMock,
  moveFileMock,
  renameFileMock,
  trashFileMock,
  untrashFileMock,
  deleteFileMock,
  createFolderMock,
  renameFolderMock,
  moveFolderMock,
  trashFolderMock,
  deleteFolderMock,
  shareWithUserMock,
  updateRoleMock,
  revokeAccessMock,
  transferOwnershipMock,
];

describe("google-drive handler", () => {
  beforeEach(() => {
    for (const m of allMocks) {
      m.mockClear();
    }
  });

  it("registers with 20 actions", () => {
    expect(handler).toBeDefined();
    expect(handler?.supportedActions).toHaveLength(20);
  });

  it("rejects unknown action", async () => {
    const r = await run("nonexistent", {});
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unsupported Google Drive");
  });

  describe("file read operations", () => {
    it("gets a file by ID", async () => {
      const r = await run("file_get", { fileId: "f1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({
        fileId: "f1",
        name: "doc.txt",
        mimeType: "text/plain",
      });
    });

    it("throws when file not found", async () => {
      getFileMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(run("file_get", { fileId: "bad" })).rejects.toThrow(
        "File not found"
      );
    });

    it("searches files by query", async () => {
      const r = await run("file_search", { query: "doc" });
      expect(r.success).toBe(true);
      expect(r.data.files).toHaveLength(2);
      expect(r.data.total).toBe(2);
    });
  });

  describe("file write operations", () => {
    it("creates a file", async () => {
      const r = await run("file_create", { name: "doc.txt" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ fileId: "f1" });
    });

    it("copies a file", async () => {
      const r = await run("file_copy", { fileId: "f1", name: "copy.txt" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ fileId: "f2" });
    });

    it("moves a file", async () => {
      const r = await run("file_move", {
        fileId: "f1",
        addParents: ["fo2"],
        removeParents: ["fo1"],
      });
      expect(r.success).toBe(true);
      expect(moveFileMock).toHaveBeenCalledTimes(1);
    });

    it("renames a file", async () => {
      const r = await run("file_rename", { fileId: "f1", newName: "new.txt" });
      expect(r.success).toBe(true);
    });

    it("trashes a file", async () => {
      const r = await run("file_trash", { fileId: "f1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ trashed: true });
    });

    it("untrashes a file", async () => {
      const r = await run("file_untrash", { fileId: "f1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ untrashed: true });
    });

    it("permanently deletes a file", async () => {
      const r = await run("file_delete", { fileId: "f1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ deleted: true });
    });
  });

  describe("folder operations", () => {
    it("creates a folder", async () => {
      const r = await run("folder_create", { name: "my-folder" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ folderId: "fo1" });
    });

    it("renames a folder", async () => {
      const r = await run("folder_rename", {
        folderId: "fo1",
        newName: "renamed",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ folderId: "fo1" });
    });

    it("moves a folder", async () => {
      const r = await run("folder_move", {
        folderId: "fo1",
        addParents: ["fo2"],
        removeParents: ["root"],
      });
      expect(r.success).toBe(true);
    });

    it("trashes a folder", async () => {
      const r = await run("folder_trash", { folderId: "fo1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ trashed: true });
    });

    it("permanently deletes a folder", async () => {
      const r = await run("folder_delete", { folderId: "fo1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ deleted: true });
    });
  });

  describe("permission operations", () => {
    it("shares with a user", async () => {
      const r = await run("permission_share", {
        fileId: "f1",
        email: "bob@co.com",
        role: "writer",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ permissionId: "perm1" });
    });

    it("defaults sendNotification to true", async () => {
      await run("permission_share", {
        fileId: "f1",
        email: "bob@co.com",
        role: "reader",
      });
      expect(shareWithUserMock).toHaveBeenCalledWith(
        expect.anything(),
        "f1",
        expect.objectContaining({ sendNotification: true })
      );
    });

    it("updates a permission role", async () => {
      const r = await run("permission_update", {
        fileId: "f1",
        permissionId: "perm1",
        role: "commenter",
      });
      expect(r.success).toBe(true);
    });

    it("revokes access", async () => {
      const r = await run("permission_revoke", {
        fileId: "f1",
        permissionId: "perm1",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ revoked: true });
    });

    it("transfers ownership", async () => {
      const r = await run("permission_transfer_ownership", {
        fileId: "f1",
        newOwnerEmail: "boss@co.com",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ permissionId: "perm2" });
    });
  });

  describe("failure propagation", () => {
    it("propagates file creation failure", async () => {
      createFileMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "storage full" })
      );
      const r = await run("file_create", { name: "x" });
      expect(r.success).toBe(false);
      expect(r.error).toBe("storage full");
    });
  });
});
