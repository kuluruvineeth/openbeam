import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { UnifiedMessage } from "@openbeam/types/bot";

type LinkResult = {
  id: string;
  teamId: string;
  userId: string;
  platform: string;
  platformUserId: string;
  platformTeamId: string;
  platformUsername: string | null;
  linkedAt: Date;
  lastActiveAt: Date;
} | null;

const findBotUserLinkMock = mock(
  (): Promise<LinkResult> =>
    Promise.resolve({
      id: "link_1",
      teamId: "t1",
      userId: "u1",
      platform: "SLACK",
      platformUserId: "U1",
      platformTeamId: "T1",
      platformUsername: null,
      linkedAt: new Date(),
      lastActiveAt: new Date(),
    })
);
const updateActivityMock = mock(() => Promise.resolve({}));

mock.module("@openbeam/db", () => ({
  findBotUserLink: findBotUserLinkMock,
  updateBotUserLinkActivity: updateActivityMock,
}));

import { resolveIdentity } from "../../src/identity/resolver";

function msg(overrides: Partial<UnifiedMessage> = {}): UnifiedMessage {
  return {
    id: "m1",
    platform: "SLACK",
    platformUserId: "U1",
    platformTeamId: "T1",
    channelId: "C1",
    text: "hi",
    isDirectMessage: false,
    isMention: false,
    timestamp: new Date(),
    rawEvent: {},
    ...overrides,
  };
}

const db = {} as Parameters<typeof resolveIdentity>[0];

describe("resolveIdentity", () => {
  beforeEach(() => {
    findBotUserLinkMock.mockClear();
    updateActivityMock.mockClear();
  });

  it("returns identity for linked user", async () => {
    const result = await resolveIdentity(db, msg());
    expect(result).toEqual({ teamId: "t1", userId: "u1" });
  });

  it("calls findBotUserLink with platform, user, team", async () => {
    await resolveIdentity(db, msg());
    expect(findBotUserLinkMock).toHaveBeenCalledWith(db, "SLACK", "U1", "T1");
  });

  it("updates last active timestamp", async () => {
    await resolveIdentity(db, msg());
    expect(updateActivityMock).toHaveBeenCalledWith(db, "link_1");
  });

  it("returns null for unlinked user", async () => {
    findBotUserLinkMock.mockImplementationOnce(() => Promise.resolve(null));
    const result = await resolveIdentity(db, msg());
    expect(result).toBeNull();
  });

  it("does not update activity for unlinked user", async () => {
    findBotUserLinkMock.mockImplementationOnce(() => Promise.resolve(null));
    await resolveIdentity(db, msg());
    expect(updateActivityMock).not.toHaveBeenCalled();
  });
});
