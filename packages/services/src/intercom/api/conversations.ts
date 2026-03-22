import type { IntercomClient } from "../client";

export type IntercomConversation = {
  type: string;
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
  state: string;
  open: boolean;
  read: boolean;
  priority: string;
  source: {
    type: string;
    id: string;
    body?: string;
    author?: { type: string; id: string; name?: string; email?: string };
    url?: string;
  };
  contacts: { contacts: Array<{ type: string; id: string }> };
  teammates: { admins?: Array<{ type: string; id: string; name?: string }> };
  assignee?: { type: string; id: string; name?: string };
  tags: { tags: Array<{ type: string; id: string; name: string }> };
  conversation_parts?: {
    conversation_parts: Array<{
      type: string;
      id: string;
      body: string | null;
      author: { type: string; id: string; name?: string; email?: string };
      created_at: number;
    }>;
  };
  statistics?: { last_contact_reply_at: number | null };
};

type ConversationListResponse = {
  type: string;
  conversations: IntercomConversation[];
};

type ConversationSearchResponse = {
  type: string;
  conversations: IntercomConversation[];
};

export async function* getAllConversations(
  client: IntercomClient
): AsyncGenerator<IntercomConversation[], void, undefined> {
  for await (const page of client.paginateList<ConversationListResponse>(
    "/conversations",
    { per_page: "150" }
  )) {
    if (page.conversations.length > 0) {
      yield page.conversations;
    }
  }
}

export async function* searchConversationsUpdatedAfter(
  client: IntercomClient,
  updatedAfterUnix: number
): AsyncGenerator<IntercomConversation[], void, undefined> {
  const body = {
    query: {
      field: "updated_at",
      operator: ">",
      value: updatedAfterUnix,
    },
    sort: { field: "updated_at", order: "ascending" },
  };

  for await (const page of client.searchPaginate<ConversationSearchResponse>(
    "/conversations/search",
    body
  )) {
    if (page.conversations.length > 0) {
      yield page.conversations;
    }
  }
}

export function getConversation(
  client: IntercomClient,
  conversationId: string
): Promise<IntercomConversation> {
  return client.get<IntercomConversation>(`/conversations/${conversationId}`, {
    display_as: "plaintext",
  });
}

export function replyToConversation(
  client: IntercomClient,
  conversationId: string,
  body: string,
  adminId: string
): Promise<unknown> {
  return client.post(`/conversations/${conversationId}/reply`, {
    message_type: "comment",
    type: "admin",
    admin_id: adminId,
    body,
  });
}

export function tagConversation(
  client: IntercomClient,
  conversationId: string,
  tagId: string,
  adminId: string
): Promise<unknown> {
  return client.post(`/conversations/${conversationId}/tags`, {
    id: tagId,
    admin_id: adminId,
  });
}
