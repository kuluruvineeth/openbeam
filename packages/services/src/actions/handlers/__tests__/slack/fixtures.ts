import { mock } from "bun:test";

export type SendMessageStub = {
  success: boolean;
  messageTs?: string;
  channelId?: string;
  error?: string;
};

export const sendMessageMock = mock(
  (): Promise<SendMessageStub> =>
    Promise.resolve({ success: true, messageTs: "1.2", channelId: "C1" })
);
export const updateMessageMock = mock(() =>
  Promise.resolve({ success: true, messageTs: "1.2", channelId: "C1" })
);
export const deleteMessageMock = mock(() => Promise.resolve({ success: true }));
export const addReactionMock = mock(() => Promise.resolve({ success: true }));
export const createChannelMock = mock(() =>
  Promise.resolve({ success: true, channelId: "C9" })
);
export const archiveChannelMock = mock(() =>
  Promise.resolve({ success: true })
);
export const setChannelTopicMock = mock(() =>
  Promise.resolve({ success: true })
);
export const setChannelPurposeMock = mock(() =>
  Promise.resolve({ success: true })
);
export const inviteToChannelMock = mock(() =>
  Promise.resolve({ success: true })
);
export const sendDMMock = mock(() =>
  Promise.resolve({ success: true, messageTs: "1.2", channelId: "D1" })
);
export const searchMessagesMock = mock(() =>
  Promise.resolve({ matches: [{ ts: "1" }], total: 1 })
);

type SlackUserStub = {
  id: string;
  name: string;
  profile: { display_name: string; email: string };
} | null;

export const getUserInfoMock = mock(
  (): Promise<SlackUserStub> =>
    Promise.resolve({
      id: "U1",
      name: "alice",
      profile: { display_name: "Alice", email: "alice@co.com" },
    })
);
export const lookupUserByEmailMock = mock(
  (): Promise<SlackUserStub> =>
    Promise.resolve({
      id: "U2",
      name: "bob",
      profile: { display_name: "Bob", email: "bob@co.com" },
    })
);
export const uploadFileMock = mock(() =>
  Promise.resolve({
    ok: true,
    file: { id: "F1", url_private_download: "https://dl/f1" },
  })
);

type BookmarkStub = { id: string } | null;

export const addBookmarkMock = mock(
  (): Promise<BookmarkStub> => Promise.resolve({ id: "B1" })
);

mock.module("../../../../slack/actions", () => ({
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

mock.module("../../../../slack/api/search", () => ({
  searchMessages: searchMessagesMock,
}));

mock.module("../../../../slack/api/users", () => ({
  getUserInfo: getUserInfoMock,
  lookupUserByEmail: lookupUserByEmailMock,
}));

mock.module("../../../../slack/api/files", () => ({
  uploadFile: uploadFileMock,
}));

mock.module("../../../../slack/api/bookmarks", () => ({
  addBookmark: addBookmarkMock,
}));

mock.module("../../../../slack/client", () => ({
  createSlackClient: () => ({
    call: mock(() => Promise.resolve({ ok: true })),
  }),
}));

import { getHandler } from "../../../handler-registry";
import "../../slack";

export const handler = getHandler("slack");

export const credentials = {
  accessToken: "xoxb-access",
  config: { syncAccessToken: "xoxp-sync", teamId: "T1" },
};

export function run(actionId: string, params: Record<string, unknown>) {
  if (!handler) {
    throw new Error("slack handler not registered");
  }
  return handler.execute(actionId, params, credentials, "conn_1");
}

export function resetMocks(): void {
  for (const m of [
    sendMessageMock,
    updateMessageMock,
    deleteMessageMock,
    addReactionMock,
    createChannelMock,
    archiveChannelMock,
    setChannelTopicMock,
    setChannelPurposeMock,
    inviteToChannelMock,
    sendDMMock,
    searchMessagesMock,
    getUserInfoMock,
    lookupUserByEmailMock,
    uploadFileMock,
    addBookmarkMock,
  ]) {
    m.mockClear();
  }
}
