import { beforeEach, describe, expect, it } from "bun:test";
import {
  addBookmarkMock,
  getUserInfoMock,
  lookupUserByEmailMock,
  resetMocks,
  run,
  uploadFileMock,
} from "./fixtures";

describe("slack user, file & bookmark actions", () => {
  beforeEach(resetMocks);

  describe("user_lookup", () => {
    it("looks up by user_id", async () => {
      const r = await run("user_lookup", { user_id: "U1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({
        id: "U1",
        name: "Alice",
        email: "alice@co.com",
      });
    });

    it("looks up by email when user_id is absent", async () => {
      const r = await run("user_lookup", { email: "bob@co.com" });
      expect(r.success).toBe(true);
      expect(lookupUserByEmailMock).toHaveBeenCalledWith(
        expect.anything(),
        "bob@co.com"
      );
      expect(r.data).toEqual({
        id: "U2",
        name: "Bob",
        email: "bob@co.com",
      });
    });

    it("throws validation error when neither is provided", async () => {
      await expect(run("user_lookup", {})).rejects.toThrow(
        "email or user_id is required"
      );
    });

    it("throws not found when upstream returns null", async () => {
      getUserInfoMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(run("user_lookup", { user_id: "U_X" })).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("file_upload", () => {
    it("uploads content to channels", async () => {
      const r = await run("file_upload", {
        channels: ["C1", "C2"],
        filename: "hello.txt",
        content: "hi",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ id: "F1", url: "https://dl/f1" });
      expect(uploadFileMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          channels: ["C1", "C2"],
          filename: "hello.txt",
          content: "hi",
        })
      );
    });

    it("rejects empty channels list", async () => {
      await expect(
        run("file_upload", { channels: [], filename: "x", content: "x" })
      ).rejects.toThrow("channels is required");
    });
  });

  describe("bookmark_add", () => {
    it("adds a bookmark", async () => {
      const r = await run("bookmark_add", {
        channel: "C1",
        title: "docs",
        link: "https://docs.co",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ id: "B1" });
    });

    it("throws when upstream returns null", async () => {
      addBookmarkMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(
        run("bookmark_add", {
          channel: "C1",
          title: "docs",
          link: "https://docs.co",
        })
      ).rejects.toThrow("Slack bookmark creation failed");
    });
  });
});
