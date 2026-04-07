import { beforeEach, describe, expect, it } from "bun:test";
import {
  addReactionMock,
  deleteMessageMock,
  resetMocks,
  run,
  searchMessagesMock,
  sendMessageMock,
  updateMessageMock,
} from "./fixtures";

describe("slack message actions", () => {
  beforeEach(resetMocks);

  describe("message_send", () => {
    it("sends a message and returns ts + channel", async () => {
      const r = await run("message_send", { channel: "C1", text: "hi" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ ts: "1.2", channel: "C1" });
    });

    it("passes blocks through", async () => {
      await run("message_send", {
        channel: "C1",
        text: "hi",
        blocks: [{ type: "section" }],
      });
      expect(sendMessageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ blocks: [{ type: "section" }] })
      );
    });

    it("returns failure when upstream fails", async () => {
      sendMessageMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "not_in_channel" })
      );
      const r = await run("message_send", { channel: "C1", text: "hi" });
      expect(r.success).toBe(false);
      expect(r.error).toBe("not_in_channel");
    });

    it("throws validation error when channel is missing", async () => {
      await expect(run("message_send", { text: "hi" })).rejects.toThrow(
        "channel is required"
      );
    });
  });

  describe("message_update", () => {
    it("updates a message with blocks", async () => {
      await run("message_update", {
        channel: "C1",
        ts: "1.2",
        text: "new",
        blocks: [{ type: "section" }],
      });
      expect(updateMessageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ blocks: [{ type: "section" }] })
      );
    });
  });

  describe("message_delete", () => {
    it("deletes a message by channel + ts", async () => {
      const r = await run("message_delete", { channel: "C1", ts: "1.2" });
      expect(r.success).toBe(true);
      expect(deleteMessageMock).toHaveBeenCalledWith(expect.anything(), {
        channel: "C1",
        ts: "1.2",
      });
    });
  });

  describe("message_reply", () => {
    it("requires thread_ts", async () => {
      await expect(
        run("message_reply", { channel: "C1", text: "hi" })
      ).rejects.toThrow("thread_ts is required");
    });

    it("sends a reply with thread_ts", async () => {
      await run("message_reply", {
        channel: "C1",
        text: "hi",
        thread_ts: "1.2",
      });
      expect(sendMessageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ threadTs: "1.2" })
      );
    });
  });

  describe("message_add_reaction", () => {
    it("calls addReaction", async () => {
      const r = await run("message_add_reaction", {
        channel: "C1",
        timestamp: "1.2",
        emoji: "eyes",
      });
      expect(r.success).toBe(true);
      expect(addReactionMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ emoji: "eyes" })
      );
    });
  });

  describe("message_search", () => {
    it("returns matches and total", async () => {
      const r = await run("message_search", { query: "test" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ messages: [{ ts: "1" }], total: 1 });
    });

    it("honors count and sort", async () => {
      await run("message_search", {
        query: "test",
        count: 5,
        sort: "timestamp",
      });
      expect(searchMessagesMock).toHaveBeenCalledWith(
        expect.anything(),
        "test",
        { count: 5, sort: "timestamp" }
      );
    });
  });

  describe("dm_send", () => {
    it("sends a DM", async () => {
      const r = await run("dm_send", { user_id: "U1", text: "hi" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ ts: "1.2", channel: "D1" });
    });
  });
});
