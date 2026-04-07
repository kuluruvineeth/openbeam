import { beforeEach, describe, expect, it } from "bun:test";
import {
  archiveChannelMock,
  handler,
  inviteToChannelMock,
  resetMocks,
  run,
  setChannelPurposeMock,
} from "./fixtures";

describe("slack channel actions", () => {
  beforeEach(resetMocks);

  it("registers the slack handler with supportedActions", () => {
    expect(handler).toBeDefined();
    expect(handler?.supportedActions).toContain("message_send");
    expect(handler?.supportedActions).toContain("channel_create");
    expect(handler?.supportedActions).toContain("user_lookup");
  });

  it("rejects unknown action", async () => {
    const r = await run("nonexistent_action", {});
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unsupported Slack action");
  });

  describe("channel_create", () => {
    it("creates a channel and skips purpose when no description", async () => {
      const r = await run("channel_create", { name: "eng" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ channelId: "C9", name: "eng" });
      expect(setChannelPurposeMock).not.toHaveBeenCalled();
    });

    it("sets purpose when description is provided", async () => {
      await run("channel_create", { name: "eng", description: "engineering" });
      expect(setChannelPurposeMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ purpose: "engineering" })
      );
    });
  });

  describe("channel_archive", () => {
    it("archives a channel", async () => {
      const r = await run("channel_archive", { channel: "C1" });
      expect(r.success).toBe(true);
      expect(archiveChannelMock).toHaveBeenCalledWith(expect.anything(), "C1");
    });
  });

  describe("channel_set_topic", () => {
    it("sets the channel topic", async () => {
      const r = await run("channel_set_topic", {
        channel: "C1",
        topic: "new topic",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ topic: "new topic" });
    });
  });

  describe("channel_invite", () => {
    it("invites a single user_id", async () => {
      const r = await run("channel_invite", { channel: "C1", user_id: "U1" });
      expect(r.success).toBe(true);
      expect(inviteToChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ users: ["U1"] })
      );
    });

    it("invites multiple users via users array", async () => {
      await run("channel_invite", {
        channel: "C1",
        users: ["U1", "U2", "U3"],
      });
      expect(inviteToChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ users: ["U1", "U2", "U3"] })
      );
    });
  });
});
