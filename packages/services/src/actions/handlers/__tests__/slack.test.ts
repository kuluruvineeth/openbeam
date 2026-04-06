import { beforeEach, describe, expect, it, mock } from "bun:test";

const sendMessageMock = mock(() =>
  Promise.resolve({ success: true, messageTs: "1.2", channelId: "C1" })
);
const updateMessageMock = mock(() =>
  Promise.resolve({ success: true, messageTs: "1.2", channelId: "C1" })
);
const deleteMessageMock = mock(() => Promise.resolve({ success: true }));
const addReactionMock = mock(() => Promise.resolve({ success: true }));
const createChannelMock = mock(() =>
  Promise.resolve({ success: true, channelId: "C9" })
);
const archiveChannelMock = mock(() => Promise.resolve({ success: true }));
const setChannelTopicMock = mock(() => Promise.resolve({ success: true }));
const setChannelPurposeMock = mock(() => Promise.resolve({ success: true }));
const inviteToChannelMock = mock(() => Promise.resolve({ success: true }));
const sendDMMock = mock(() =>
  Promise.resolve({ success: true, messageTs: "1.2", channelId: "D1" })
);

const searchMessagesMock = mock(() =>
  Promise.resolve({ matches: [{ ts: "1" }], total: 1 })
);
const getUserInfoMock = mock(() =>
  Promise.resolve({
    id: "U1",
    name: "alice",
    profile: { display_name: "Alice", email: "alice@co.com" },
  })
);
const lookupUserByEmailMock = mock(() =>
  Promise.resolve({
    id: "U2",
    name: "bob",
    profile: { display_name: "Bob", email: "bob@co.com" },
  })
);
const uploadFileMock = mock(() =>
  Promise.resolve({
    ok: true,
    file: { id: "F1", url_private_download: "https://dl/f1" },
  })
);
const addBookmarkMock = mock(() => Promise.resolve({ id: "B1" }));

mock.module("../../../slack/actions", () => ({
  sendMessage: sendMessageMock,
  updateMessage: updateMessageMock,
  deleteMessage: deleteMessageMock,
  addReaction: addReactionMock,
  createChannel: createChannelMock,
  archiveChannel: archiveChannelMock,
  setChannelTopic: setChannelTopicMock,
  setChannelPurpose: setChannelPurposeMock,
  inviteToChannel: inviteToChannelMock,
  sendDM: sendDMMock,
}));

mock.module("../../../slack/api/search", () => ({
  searchMessages: searchMessagesMock,
}));

mock.module("../../../slack/api/users", () => ({
  getUserInfo: getUserInfoMock,
  lookupUserByEmail: lookupUserByEmailMock,
}));

mock.module("../../../slack/api/files", () => ({
  uploadFile: uploadFileMock,
}));

mock.module("../../../slack/api/bookmarks", () => ({
  addBookmark: addBookmarkMock,
}));

mock.module("../../../slack/client", () => ({
  createSlackClient: () => ({
    call: mock(() => Promise.resolve({ ok: true })),
  }),
}));

import { getHandler } from "../../handler-registry";
import "../slack";

const handler = getHandler("slack");

const credentials = {
  accessToken: "xoxb-access",
  config: { syncAccessToken: "xoxp-sync", teamId: "T1" },
};

async function run(actionId: string, params: Record<string, unknown>) {
  if (!handler) {
    throw new Error("slack handler not registered");
  }
  return await handler.execute(actionId, params, credentials, "conn_1");
}

describe("slack handler", () => {
  beforeEach(() => {
    sendMessageMock.mockClear();
    updateMessageMock.mockClear();
    deleteMessageMock.mockClear();
    addReactionMock.mockClear();
    createChannelMock.mockClear();
    archiveChannelMock.mockClear();
    setChannelTopicMock.mockClear();
    setChannelPurposeMock.mockClear();
    inviteToChannelMock.mockClear();
    sendDMMock.mockClear();
    searchMessagesMock.mockClear();
    getUserInfoMock.mockClear();
    lookupUserByEmailMock.mockClear();
    uploadFileMock.mockClear();
    addBookmarkMock.mockClear();
  });

  it("registers the slack handler with supportedActions", () => {
    expect(handler).toBeDefined();
    expect(handler?.supportedActions).toContain("message_send");
    expect(handler?.supportedActions).toContain("message_delete");
    expect(handler?.supportedActions).toContain("user_lookup");
  });

  describe("message_send", () => {
    it("sends a message and returns ts + channel", async () => {
      const result = await run("message_send", {
        channel: "C1",
        text: "hi",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ ts: "1.2", channel: "C1" });
    });

    it("passes blocks through", async () => {
      await run("message_send", {
        channel: "C1",
        text: "hi",
        blocks: [{ type: "section" }],
      });
      expect(sendMessageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          blocks: [{ type: "section" }],
        })
      );
    });

    it("returns failure when upstream fails", async () => {
      sendMessageMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "not_in_channel" })
      );
      const result = await run("message_send", { channel: "C1", text: "hi" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_in_channel");
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
      const result = await run("message_delete", { channel: "C1", ts: "1.2" });
      expect(result.success).toBe(true);
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
    it("calls addReaction with channel + timestamp + emoji", async () => {
      const result = await run("message_add_reaction", {
        channel: "C1",
        timestamp: "1.2",
        emoji: "eyes",
      });
      expect(result.success).toBe(true);
      expect(addReactionMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ emoji: "eyes" })
      );
    });
  });

  describe("message_search", () => {
    it("returns matches and total", async () => {
      const result = await run("message_search", { query: "test" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messages: [{ ts: "1" }], total: 1 });
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

  describe("channel_create", () => {
    it("creates a channel and skips purpose when no description", async () => {
      const result = await run("channel_create", { name: "eng" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ channelId: "C9", name: "eng" });
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
      const result = await run("channel_archive", { channel: "C1" });
      expect(result.success).toBe(true);
      expect(archiveChannelMock).toHaveBeenCalledWith(expect.anything(), "C1");
    });
  });

  describe("channel_set_topic", () => {
    it("sets the channel topic", async () => {
      const result = await run("channel_set_topic", {
        channel: "C1",
        topic: "new topic",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ topic: "new topic" });
    });
  });

  describe("channel_invite", () => {
    it("invites a single user_id", async () => {
      const result = await run("channel_invite", {
        channel: "C1",
        user_id: "U1",
      });
      expect(result.success).toBe(true);
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

  describe("user_lookup", () => {
    it("looks up by user_id", async () => {
      const result = await run("user_lookup", { user_id: "U1" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "U1",
        name: "Alice",
        email: "alice@co.com",
      });
    });

    it("looks up by email when user_id is absent", async () => {
      const result = await run("user_lookup", { email: "bob@co.com" });
      expect(result.success).toBe(true);
      expect(lookupUserByEmailMock).toHaveBeenCalledWith(
        expect.anything(),
        "bob@co.com"
      );
      expect(result.data).toEqual({
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

    it("throws not found error when upstream returns null", async () => {
      getUserInfoMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(run("user_lookup", { user_id: "U_X" })).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("file_upload", () => {
    it("uploads content to channels", async () => {
      const result = await run("file_upload", {
        channels: ["C1", "C2"],
        filename: "hello.txt",
        content: "hi",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "F1", url: "https://dl/f1" });
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

  describe("dm_send", () => {
    it("sends a DM", async () => {
      const result = await run("dm_send", { user_id: "U1", text: "hi" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ ts: "1.2", channel: "D1" });
    });
  });

  describe("bookmark_add", () => {
    it("adds a bookmark", async () => {
      const result = await run("bookmark_add", {
        channel: "C1",
        title: "docs",
        link: "https://docs.co",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "B1" });
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

  describe("unsupported action", () => {
    it("returns error for unknown actionId", async () => {
      const result = await run("nonexistent_action", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported Slack action");
    });
  });
});
