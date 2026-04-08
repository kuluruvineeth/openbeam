import { describe, expect, it, mock } from "bun:test";
import type { UnifiedMessage } from "@openbeam/types/bot";

const createLinkRequestMock = mock(() => Promise.resolve({}));

mock.module("@openbeam/db", () => ({
  createBotLinkRequest: createLinkRequestMock,
}));

mock.module("../../src/env", () => ({
  env: { BOT_LINK_BASE_URL: "https://app.openbeam.work" },
}));

import { buildLinkUrl, createLinkToken } from "../../src/identity/linking";

function msg(): UnifiedMessage {
  return {
    id: "m1",
    platform: "DISCORD",
    platformUserId: "D1",
    platformTeamId: "G1",
    channelId: "C1",
    text: "hi",
    isDirectMessage: true,
    isMention: false,
    timestamp: new Date(),
    rawEvent: {},
  };
}

const db = {} as Parameters<typeof createLinkToken>[0];

const HEX_TOKEN_RE = /^[a-f0-9]{64}$/;

describe("createLinkToken", () => {
  it("generates a hex token", async () => {
    const token = await createLinkToken(db, msg());
    expect(token).toMatch(HEX_TOKEN_RE);
  });

  it("calls createBotLinkRequest with platform data", async () => {
    await createLinkToken(db, msg());
    expect(createLinkRequestMock).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        platform: "DISCORD",
        platformUserId: "D1",
        platformTeamId: "G1",
      })
    );
  });

  it("sets expiry in the future", async () => {
    await createLinkToken(db, msg());
    const call = createLinkRequestMock.mock.calls[0] as unknown as [
      unknown,
      { expiresAt: Date },
    ];
    const expiry = call[1].expiresAt;
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("buildLinkUrl", () => {
  it("builds URL with token parameter", () => {
    const url = buildLinkUrl("abc123");
    expect(url).toBe("https://app.openbeam.work/bot/link?token=abc123");
  });
});
