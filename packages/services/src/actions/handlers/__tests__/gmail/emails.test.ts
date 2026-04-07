import { beforeEach, describe, expect, it } from "bun:test";
import {
  batchGetMessagesMock,
  clientGetMock,
  getMessageMock,
  replyToEmailMock,
  resetMocks,
  run,
  sendEmailMock,
} from "./fixtures";

describe("gmail email actions", () => {
  beforeEach(resetMocks);

  describe("email_send", () => {
    it("sends an email and returns messageId + threadId", async () => {
      const result = await run("email_send", {
        to: "bob@co.com",
        subject: "Hello",
        body: "Hi Bob",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: "m1", threadId: "t1" });
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("rejects when to is empty", async () => {
      await expect(
        run("email_send", { to: "", subject: "X", body: "Y" })
      ).rejects.toThrow("to is required");
    });

    it("deduplicates and normalizes to addresses", async () => {
      await run("email_send", {
        to: "Alice <alice@co.com>, alice@co.com",
        subject: "Dup",
        body: "test",
      });
      const call = sendEmailMock.mock.calls[0] as unknown[];
      const opts = call[1] as { to: string[] };
      expect(opts.to).toEqual(["alice@co.com"]);
    });

    it("detects HTML body", async () => {
      await run("email_send", {
        to: "bob@co.com",
        subject: "HTML",
        body: "<p>Hello</p>",
      });
      const call = sendEmailMock.mock.calls[0] as unknown[];
      const opts = call[1] as { isHtml: boolean };
      expect(opts.isHtml).toBe(true);
    });

    it("returns failure when sendEmail fails", async () => {
      sendEmailMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "quota" })
      );
      const result = await run("email_send", {
        to: "a@b.com",
        subject: "X",
        body: "Y",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("quota");
    });
  });

  describe("email_reply", () => {
    it("replies to an email", async () => {
      const result = await run("email_reply", {
        threadId: "t1",
        messageId: "m1",
        body: "Got it",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: "r1", threadId: "t1" });
      expect(replyToEmailMock).toHaveBeenCalledTimes(1);
    });

    it("throws when message not found", async () => {
      getMessageMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(
        run("email_reply", {
          threadId: "t1",
          messageId: "m1",
          body: "x",
        })
      ).rejects.toThrow("Message not found");
    });

    it("filters self from reply-all recipients", async () => {
      await run("email_reply", {
        threadId: "t1",
        messageId: "m1",
        body: "x",
        replyAll: true,
      });
      const call = replyToEmailMock.mock.calls[0] as unknown[];
      const opts = call[1] as { to: string[]; cc: string[] };
      expect(opts.to).not.toContain("me@co.com");
      expect(opts.cc).not.toContain("me@co.com");
    });
  });

  describe("email_forward", () => {
    it("forwards a message", async () => {
      const result = await run("email_forward", {
        messageId: "m1",
        to: "fwd@co.com",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: "m1" });
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("prefixes subject with Fwd:", async () => {
      await run("email_forward", {
        messageId: "m1",
        to: "fwd@co.com",
      });
      const call = sendEmailMock.mock.calls[0] as unknown[];
      const opts = call[1] as { subject: string };
      expect(opts.subject).toBe("Fwd: Project update");
    });

    it("does not double-prefix Fwd:", async () => {
      getMessageMock.mockImplementationOnce(() =>
        Promise.resolve({
          id: "m1",
          threadId: "t1",
          snippet: "x",
          payload: {
            headers: [
              { name: "Subject", value: "Fwd: Already forwarded" },
              { name: "From", value: "a@co.com" },
            ],
          },
        })
      );
      await run("email_forward", {
        messageId: "m1",
        to: "fwd@co.com",
      });
      const call = sendEmailMock.mock.calls[0] as unknown[];
      const opts = call[1] as { subject: string };
      expect(opts.subject).toBe("Fwd: Already forwarded");
    });

    it("throws when message not found", async () => {
      getMessageMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(
        run("email_forward", { messageId: "m1", to: "a@b.com" })
      ).rejects.toThrow("Message not found");
    });
  });

  describe("email_search", () => {
    it("searches messages by query", async () => {
      const result = await run("email_search", { query: "test" });
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(1);
      expect(batchGetMessagesMock).toHaveBeenCalledTimes(1);
    });

    it("clamps maxResults to 500", async () => {
      await run("email_search", { query: "test", maxResults: 9999 });
      const call = clientGetMock.mock.calls[0] as unknown[];
      const opts = call[1] as { maxResults: number };
      expect(opts.maxResults).toBeLessThanOrEqual(500);
    });
  });

  describe("email_get", () => {
    it("returns message details", async () => {
      const result = await run("email_get", { messageId: "m1" });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: "m1",
        threadId: "t1",
        subject: "Project update",
        from: "Alice <alice@co.com>",
      });
    });

    it("throws when message not found", async () => {
      getMessageMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(run("email_get", { messageId: "m1" })).rejects.toThrow(
        "Message not found"
      );
    });
  });
});
