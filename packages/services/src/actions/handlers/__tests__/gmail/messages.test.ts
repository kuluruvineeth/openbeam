import { beforeEach, describe, expect, it } from "bun:test";
import {
  addLabelsMock,
  archiveMessageMock,
  markAsReadMock,
  markAsUnreadMock,
  modifyMessageLabelsMock,
  removeLabelsMock,
  resetMocks,
  run,
  starMock,
  trashMessageMock,
  unstarMock,
  untrashMessageMock,
} from "./fixtures";

describe("gmail message actions", () => {
  beforeEach(resetMocks);

  describe("email_trash", () => {
    it("trashes a message", async () => {
      const result = await run("email_trash", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: "m1" });
      expect(trashMessageMock).toHaveBeenCalledTimes(1);
    });

    it("returns failure on error", async () => {
      trashMessageMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "not found" })
      );
      const result = await run("email_trash", { messageId: "m1" });
      expect(result.success).toBe(false);
    });
  });

  describe("email_modify_labels", () => {
    it("modifies message labels", async () => {
      const result = await run("email_modify_labels", {
        messageId: "m1",
        addLabelIds: ["STARRED"],
        removeLabelIds: ["UNREAD"],
      });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ messageId: "m1" });
      expect(modifyMessageLabelsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_archive", () => {
    it("archives a message", async () => {
      const result = await run("message_archive", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ archived: true });
      expect(archiveMessageMock).toHaveBeenCalledTimes(1);
    });

    it("returns failure on error", async () => {
      archiveMessageMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "err" })
      );
      const result = await run("message_archive", { messageId: "m1" });
      expect(result.success).toBe(false);
    });
  });

  describe("message_trash", () => {
    it("trashes a message", async () => {
      const result = await run("message_trash", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ trashed: true });
    });
  });

  describe("message_untrash", () => {
    it("untrashes a message", async () => {
      const result = await run("message_untrash", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ untrashed: true });
      expect(untrashMessageMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_mark_read", () => {
    it("marks a message as read", async () => {
      const result = await run("message_mark_read", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ read: true });
      expect(markAsReadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_mark_unread", () => {
    it("marks a message as unread", async () => {
      const result = await run("message_mark_unread", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ unread: true });
      expect(markAsUnreadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_star", () => {
    it("stars a message", async () => {
      const result = await run("message_star", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ starred: true });
      expect(starMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_unstar", () => {
    it("unstars a message", async () => {
      const result = await run("message_unstar", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ unstarred: true });
      expect(unstarMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_add_labels", () => {
    it("adds labels to a message", async () => {
      const result = await run("message_add_labels", {
        messageId: "m1",
        labelIds: ["Projects"],
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ labeled: true });
      expect(addLabelsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("message_remove_labels", () => {
    it("removes labels from a message", async () => {
      const result = await run("message_remove_labels", {
        messageId: "m1",
        labelIds: ["Projects"],
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ removed: true });
      expect(removeLabelsMock).toHaveBeenCalledTimes(1);
    });
  });
});
