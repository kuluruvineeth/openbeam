import type { GmailClient } from "../client";

interface ModifyResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface ModifyLabelsParams {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface ModifyLabelsResult {
  success: boolean;
  messageId?: string;
  labelIds?: string[];
  error?: string;
}

export async function modifyMessageLabels(
  client: GmailClient,
  params: ModifyLabelsParams
): Promise<ModifyLabelsResult> {
  const response = await client.post<ModifyResponse>(
    `/users/me/messages/${params.messageId}/modify`,
    {
      addLabelIds: params.addLabelIds ?? [],
      removeLabelIds: params.removeLabelIds ?? [],
    }
  );

  return {
    success: true,
    messageId: response.id,
    labelIds: response.labelIds,
  };
}

export function addLabels(
  client: GmailClient,
  messageId: string,
  labelIds: string[]
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, { messageId, addLabelIds: labelIds });
}

export function removeLabels(
  client: GmailClient,
  messageId: string,
  labelIds: string[]
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, { messageId, removeLabelIds: labelIds });
}

export function markAsRead(
  client: GmailClient,
  messageId: string
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, {
    messageId,
    removeLabelIds: ["UNREAD"],
  });
}

export function markAsUnread(
  client: GmailClient,
  messageId: string
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, {
    messageId,
    addLabelIds: ["UNREAD"],
  });
}

export function star(
  client: GmailClient,
  messageId: string
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, {
    messageId,
    addLabelIds: ["STARRED"],
  });
}

export function unstar(
  client: GmailClient,
  messageId: string
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, {
    messageId,
    removeLabelIds: ["STARRED"],
  });
}

export function markAsImportant(
  client: GmailClient,
  messageId: string
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, {
    messageId,
    addLabelIds: ["IMPORTANT"],
  });
}

export function markAsNotImportant(
  client: GmailClient,
  messageId: string
): Promise<ModifyLabelsResult> {
  return modifyMessageLabels(client, {
    messageId,
    removeLabelIds: ["IMPORTANT"],
  });
}

export interface BatchModifyParams {
  messageIds: string[];
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export async function batchModifyLabels(
  client: GmailClient,
  params: BatchModifyParams
): Promise<{ success: boolean; error?: string }> {
  await client.post("/users/me/messages/batchModify", {
    ids: params.messageIds,
    addLabelIds: params.addLabelIds ?? [],
    removeLabelIds: params.removeLabelIds ?? [],
  });

  return { success: true };
}
