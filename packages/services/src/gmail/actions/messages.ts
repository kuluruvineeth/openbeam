import type { GmailClient } from "../client";

interface MessageResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

export async function archiveMessage(
  client: GmailClient,
  messageId: string
): Promise<MessageResult> {
  const response = await client.post<MessageResponse>(
    `/users/me/messages/${messageId}/modify`,
    { removeLabelIds: ["INBOX"] }
  );

  return {
    success: true,
    messageId: response.id,
    threadId: response.threadId,
  };
}

export async function unarchiveMessage(
  client: GmailClient,
  messageId: string
): Promise<MessageResult> {
  const response = await client.post<MessageResponse>(
    `/users/me/messages/${messageId}/modify`,
    { addLabelIds: ["INBOX"] }
  );

  return {
    success: true,
    messageId: response.id,
    threadId: response.threadId,
  };
}

export async function trashMessage(
  client: GmailClient,
  messageId: string
): Promise<MessageResult> {
  const response = await client.post<MessageResponse>(
    `/users/me/messages/${messageId}/trash`,
    {}
  );

  return {
    success: true,
    messageId: response.id,
    threadId: response.threadId,
  };
}

export async function untrashMessage(
  client: GmailClient,
  messageId: string
): Promise<MessageResult> {
  const response = await client.post<MessageResponse>(
    `/users/me/messages/${messageId}/untrash`,
    {}
  );

  return {
    success: true,
    messageId: response.id,
    threadId: response.threadId,
  };
}

export async function batchArchive(
  client: GmailClient,
  messageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await client.post("/users/me/messages/batchModify", {
    ids: messageIds,
    removeLabelIds: ["INBOX"],
  });

  return { success: true };
}

export async function batchTrash(
  client: GmailClient,
  messageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  for (const messageId of messageIds) {
    await client.post(`/users/me/messages/${messageId}/trash`, {});
  }

  return { success: true };
}

export interface ThreadResult {
  success: boolean;
  threadId?: string;
  error?: string;
}

export async function trashThread(
  client: GmailClient,
  threadId: string
): Promise<ThreadResult> {
  const response = await client.post<{ id: string }>(
    `/users/me/threads/${threadId}/trash`,
    {}
  );
  return { success: true, threadId: response.id ?? threadId };
}
