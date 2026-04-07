import { mock } from "bun:test";

export type SendEmailStub = {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
};

export type DraftStub = {
  success: boolean;
  draftId?: string;
  messageId?: string;
  error?: string;
};

export type MessageStub = {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
};

export type LabelsStub = {
  success: boolean;
  messageId?: string;
  labelIds?: string[];
  error?: string;
};

export type CreateLabelStub = {
  success: boolean;
  id?: string;
  name?: string;
  error?: string;
};

export type ThreadStub = {
  success: boolean;
  threadId?: string;
  error?: string;
};

export type MessageMeta = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: { headers: { name: string; value: string }[] };
};

export type ThreadMeta = {
  id: string;
  messages: unknown[];
  snippet: string;
} | null;

export const sendEmailMock = mock(
  (): Promise<SendEmailStub> =>
    Promise.resolve({ success: true, messageId: "m1", threadId: "t1" })
);

export const replyToEmailMock = mock(
  (): Promise<SendEmailStub> =>
    Promise.resolve({ success: true, messageId: "r1", threadId: "t1" })
);

export const createDraftMock = mock(
  (): Promise<DraftStub> =>
    Promise.resolve({ success: true, draftId: "d1", messageId: "md1" })
);

export const deleteDraftMock = mock(
  (): Promise<DraftStub> => Promise.resolve({ success: true })
);

export const sendDraftMock = mock(
  (): Promise<DraftStub> => Promise.resolve({ success: true, messageId: "md1" })
);

export const archiveMessageMock = mock(
  (): Promise<MessageStub> =>
    Promise.resolve({ success: true, messageId: "m1", threadId: "t1" })
);

export const trashMessageMock = mock(
  (): Promise<MessageStub> =>
    Promise.resolve({ success: true, messageId: "m1", threadId: "t1" })
);

export const untrashMessageMock = mock(
  (): Promise<MessageStub> =>
    Promise.resolve({ success: true, messageId: "m1", threadId: "t1" })
);

export const trashThreadMock = mock(
  (): Promise<ThreadStub> => Promise.resolve({ success: true, threadId: "t1" })
);

export const addLabelsMock = mock(
  (): Promise<LabelsStub> =>
    Promise.resolve({ success: true, messageId: "m1", labelIds: ["X"] })
);

export const removeLabelsMock = mock(
  (): Promise<LabelsStub> =>
    Promise.resolve({ success: true, messageId: "m1", labelIds: [] })
);

export const markAsReadMock = mock(
  (): Promise<LabelsStub> => Promise.resolve({ success: true, messageId: "m1" })
);

export const markAsUnreadMock = mock(
  (): Promise<LabelsStub> => Promise.resolve({ success: true, messageId: "m1" })
);

export const starMock = mock(
  (): Promise<LabelsStub> => Promise.resolve({ success: true, messageId: "m1" })
);

export const unstarMock = mock(
  (): Promise<LabelsStub> => Promise.resolve({ success: true, messageId: "m1" })
);

export const modifyMessageLabelsMock = mock(
  (): Promise<LabelsStub> =>
    Promise.resolve({
      success: true,
      messageId: "m1",
      labelIds: ["INBOX"],
    })
);

export const createLabelMock = mock(
  (): Promise<CreateLabelStub> =>
    Promise.resolve({ success: true, id: "L1", name: "Projects" })
);

export const getMessageMock = mock(
  (): Promise<MessageMeta | null> =>
    Promise.resolve({
      id: "m1",
      threadId: "t1",
      snippet: "original",
      payload: {
        headers: [
          { name: "From", value: "Alice <alice@co.com>" },
          { name: "Subject", value: "Project update" },
          { name: "To", value: "team@co.com, bob@co.com" },
          { name: "Cc", value: "cc@co.com" },
        ],
      },
    })
);

export const batchGetMessagesMock = mock(
  (): Promise<unknown[]> =>
    Promise.resolve([{ id: "m1", threadId: "t1", snippet: "s" }])
);

export const getThreadMock = mock(
  (): Promise<ThreadMeta> =>
    Promise.resolve({ id: "t1", messages: [{ id: "m1" }], snippet: "hi" })
);

export const listLabelsMock = mock(
  (): Promise<unknown[]> => Promise.resolve([{ id: "INBOX", name: "INBOX" }])
);

export const clientGetMock = mock(
  (): Promise<{
    messages?: { id: string; threadId: string }[];
    resultSizeEstimate?: number;
  }> =>
    Promise.resolve({
      messages: [{ id: "m1", threadId: "t1" }],
      resultSizeEstimate: 1,
    })
);

mock.module("../../../../gmail/actions/send-email", () => ({
  sendEmail: sendEmailMock,
  replyToEmail: replyToEmailMock,
}));

mock.module("../../../../gmail/actions/drafts", () => ({
  createDraft: createDraftMock,
  deleteDraft: deleteDraftMock,
  sendDraft: sendDraftMock,
}));

mock.module("../../../../gmail/actions/messages", () => ({
  archiveMessage: archiveMessageMock,
  trashMessage: trashMessageMock,
  untrashMessage: untrashMessageMock,
  trashThread: trashThreadMock,
}));

mock.module("../../../../gmail/actions/labels", () => ({
  addLabels: addLabelsMock,
  removeLabels: removeLabelsMock,
  markAsRead: markAsReadMock,
  markAsUnread: markAsUnreadMock,
  star: starMock,
  unstar: unstarMock,
  modifyMessageLabels: modifyMessageLabelsMock,
  createLabel: createLabelMock,
}));

mock.module("../../../../gmail/api/messages", () => ({
  getMessage: getMessageMock,
  batchGetMessages: batchGetMessagesMock,
}));

mock.module("../../../../gmail/api/threads", () => ({
  getThread: getThreadMock,
}));

mock.module("../../../../gmail/api/labels", () => ({
  listLabels: listLabelsMock,
}));

const EMAIL_BRACKET_RE = /<([^>]+)>/;

mock.module("../../../../gmail/utils/content-extractor", () => ({
  parseHeaders: (message: MessageMeta) => {
    const headers = new Map(
      message.payload?.headers.map((h) => [h.name.toLowerCase(), h.value]) ?? []
    );
    return {
      from: headers.get("from"),
      to: headers
        .get("to")
        ?.split(",")
        .map((s) => s.trim()),
      cc: headers
        .get("cc")
        ?.split(",")
        .map((s) => s.trim()),
      subject: headers.get("subject"),
    };
  },
  extractEmailAddress: (value: string) => {
    const match = EMAIL_BRACKET_RE.exec(value);
    return match ? match[1] : value.trim();
  },
  extractContent: (message: MessageMeta) => ({
    plain: message.snippet ?? "",
    html: undefined,
  }),
}));

mock.module("../../../../gmail/client", () => ({
  createGmailClient: () => ({
    get: clientGetMock,
  }),
}));

import { getHandler } from "../../../handler-registry";
import "../../gmail";

export const handler = getHandler("gmail");

export const credentials = {
  accessToken: "ya29.token",
  config: { userEmail: "me@co.com" },
};

export async function run(actionId: string, params: Record<string, unknown>) {
  if (!handler) {
    throw new Error("gmail handler not registered");
  }
  return await handler.execute(actionId, params, credentials, "conn_1");
}

export function resetMocks(): void {
  sendEmailMock.mockClear();
  replyToEmailMock.mockClear();
  createDraftMock.mockClear();
  deleteDraftMock.mockClear();
  sendDraftMock.mockClear();
  archiveMessageMock.mockClear();
  trashMessageMock.mockClear();
  untrashMessageMock.mockClear();
  trashThreadMock.mockClear();
  addLabelsMock.mockClear();
  removeLabelsMock.mockClear();
  markAsReadMock.mockClear();
  markAsUnreadMock.mockClear();
  starMock.mockClear();
  unstarMock.mockClear();
  modifyMessageLabelsMock.mockClear();
  createLabelMock.mockClear();
  getMessageMock.mockClear();
  batchGetMessagesMock.mockClear();
  getThreadMock.mockClear();
  listLabelsMock.mockClear();
  clientGetMock.mockClear();
}
