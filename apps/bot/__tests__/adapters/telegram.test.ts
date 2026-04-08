import { describe, expect, it } from "bun:test";
import { TelegramAdapter } from "../../src/adapters/telegram";

describe("TelegramAdapter", () => {
  const adapter = new TelegramAdapter();

  describe("verifySignature", () => {
    it("returns false when no secret is configured", () => {
      const result = adapter.verifySignature("body", {});
      expect(result).toBe(false);
    });
  });

  describe("parseEvent", () => {
    it("parses a text message update", async () => {
      const update = {
        update_id: 123,
        message: {
          message_id: 456,
          from: { id: 789, is_bot: false, first_name: "Alice" },
          chat: { id: 100, type: "private" },
          date: 1_700_000_000,
          text: "hello world",
        },
      };
      const result = await adapter.parseEvent(update, {});
      expect(result).not.toBeNull();
      expect(result?.text).toBe("hello world");
      expect(result?.platformUserId).toBe("789");
      expect(result?.isDirectMessage).toBe(true);
    });

    it("extracts command and body from /search query", async () => {
      const update = {
        update_id: 124,
        message: {
          message_id: 457,
          from: { id: 789, is_bot: false, first_name: "Alice" },
          chat: { id: 100, type: "private" },
          date: 1_700_000_000,
          text: "/search deploy docs",
        },
      };
      const result = await adapter.parseEvent(update, {});
      expect(result?.command).toBe("search");
      expect(result?.text).toBe("deploy docs");
    });

    it("returns null for updates without message", async () => {
      const result = await adapter.parseEvent({ update_id: 125 }, {});
      expect(result).toBeNull();
    });

    it("returns null for channel posts without from", async () => {
      const update = {
        update_id: 126,
        message: {
          message_id: 458,
          chat: { id: 100, type: "channel" },
          date: 1_700_000_000,
          text: "channel post",
        },
      };
      const result = await adapter.parseEvent(update, {});
      expect(result).toBeNull();
    });
  });
});
