import { describe, expect, it, mock } from "bun:test";

mock.module("../../src/env", () => ({
  env: {
    SLACK_BOT_TOKEN: "xoxb-test",
    SLACK_SIGNING_SECRET: "test-secret",
    SLACK_APP_ID: "A123",
    BOT_PORT: 3005,
    DATABASE_URL: "postgres://",
    REDIS_URL: "redis://",
    BOT_LINK_BASE_URL: "https://test.openbeam.work",
  },
}));

mock.module("@openbeam/services", () => ({
  verifySlackSignature: (req: { signature: string }, _secret: string) => {
    if (req.signature === "valid-sig") {
      return { valid: true };
    }
    return { valid: false, reason: "bad" };
  },
  parseSlackEvent: () => ({ success: false, error: "not tested" }),
  createSlackClient: () => ({ call: () => Promise.resolve({}) }),
}));

import { SlackAdapter } from "../../src/adapters/slack";

describe("SlackAdapter", () => {
  const adapter = new SlackAdapter();

  describe("verifySignature", () => {
    it("returns true for valid signature", () => {
      const result = adapter.verifySignature("body", {
        "x-slack-signature": "valid-sig",
        "x-slack-request-timestamp": "123",
      });
      expect(result).toBe(true);
    });

    it("returns false for invalid signature", () => {
      const result = adapter.verifySignature("body", {
        "x-slack-signature": "bad-sig",
        "x-slack-request-timestamp": "123",
      });
      expect(result).toBe(false);
    });
  });

  describe("parseEvent", () => {
    it("returns null for unparseable events", async () => {
      const result = await adapter.parseEvent({}, {});
      expect(result).toBeNull();
    });
  });
});
