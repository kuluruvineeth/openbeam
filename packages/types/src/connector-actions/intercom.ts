export interface IntercomConversationReplyResult {
  conversationId: string | undefined;
}

export interface IntercomConversationTagResult {
  conversationId: string | undefined;
}

export interface IntercomAdminListResult {
  admins: unknown[];
}

export interface IntercomTagListResult {
  tags: unknown[];
}

export interface IntercomArticleCreateResult {
  articleId: string | undefined;
  url: string | undefined;
}

export interface IntercomActionResults {
  conversation_reply: IntercomConversationReplyResult;
  conversation_tag: IntercomConversationTagResult;
  admin_list: IntercomAdminListResult;
  tag_list: IntercomTagListResult;
  article_create: IntercomArticleCreateResult;
}
