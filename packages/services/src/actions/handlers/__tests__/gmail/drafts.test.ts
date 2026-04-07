import { beforeEach, describe, expect, it } from "bun:test";
import {
  createDraftMock,
  deleteDraftMock,
  resetMocks,
  run,
  sendDraftMock,
} from "./fixtures";

describe("gmail draft actions", () => {
  beforeEach(resetMocks);

  describe("draft_create", () => {
    it("creates a draft", async () => {
      const result = await run("draft_create", {
        to: "bob@co.com",
        subject: "Draft",
        body: "WIP",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ draftId: "d1", messageId: "md1" });
      expect(createDraftMock).toHaveBeenCalledTimes(1);
    });

    it("allows empty body", async () => {
      const result = await run("draft_create", {
        to: "bob@co.com",
        subject: "Empty",
      });
      expect(result.success).toBe(true);
    });

    it("returns failure on error", async () => {
      createDraftMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "quota" })
      );
      const result = await run("draft_create", {
        to: "bob@co.com",
        subject: "X",
        body: "Y",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("quota");
    });
  });

  describe("draft_delete", () => {
    it("deletes a draft", async () => {
      const result = await run("draft_delete", { draftId: "d1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deleted: true });
      expect(deleteDraftMock).toHaveBeenCalledTimes(1);
    });

    it("returns failure on error", async () => {
      deleteDraftMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "not found" })
      );
      const result = await run("draft_delete", { draftId: "d1" });
      expect(result.success).toBe(false);
    });
  });

  describe("draft_send", () => {
    it("sends a draft", async () => {
      const result = await run("draft_send", { draftId: "d1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: "md1" });
      expect(sendDraftMock).toHaveBeenCalledTimes(1);
    });

    it("returns failure on error", async () => {
      sendDraftMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "not found" })
      );
      const result = await run("draft_send", { draftId: "d1" });
      expect(result.success).toBe(false);
    });
  });
});
