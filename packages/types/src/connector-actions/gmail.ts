export interface GmailEmailSendResult {
  messageId: string | undefined;
  threadId: string | undefined;
}

export interface GmailEmailReplyResult {
  messageId: string | undefined;
  threadId: string | undefined;
}

export interface GmailEmailForwardResult {
  messageId: string | undefined;
}

export interface GmailEmailSearchResult {
  messages: unknown[];
  total: number;
}

export interface GmailEmailGetResult {
  id: string | undefined;
  threadId: string | undefined;
  subject: string;
  from: string;
  snippet: string;
}

export interface GmailEmailTrashResult {
  messageId: string | undefined;
}

export interface GmailEmailModifyLabelsResult {
  messageId: string | undefined;
  labelIds: string[];
}

export interface GmailLabelListResult {
  labels: unknown[];
}

export interface GmailLabelCreateResult {
  id: string | undefined;
  name: string | undefined;
}

export interface GmailDraftCreateResult {
  draftId: string | undefined;
  messageId: string | undefined;
}

export interface GmailDraftDeleteResult {
  deleted: true;
}

export interface GmailDraftSendResult {
  messageId: string | undefined;
}

export interface GmailThreadGetResult {
  id: string | undefined;
  messages: unknown[];
  snippet: string;
}

export interface GmailThreadTrashResult {
  threadId: string | undefined;
}

export interface GmailMessageArchiveResult {
  archived: true;
}

export interface GmailMessageTrashResult {
  trashed: true;
}

export interface GmailMessageUntrashResult {
  untrashed: true;
}

export interface GmailMessageMarkReadResult {
  read: true;
}

export interface GmailMessageMarkUnreadResult {
  unread: true;
}

export interface GmailMessageStarResult {
  starred: true;
}

export interface GmailMessageUnstarResult {
  unstarred: true;
}

export interface GmailMessageAddLabelsResult {
  labeled: true;
}

export interface GmailMessageRemoveLabelsResult {
  removed: true;
}

export interface GmailActionResults {
  email_send: GmailEmailSendResult;
  email_reply: GmailEmailReplyResult;
  email_forward: GmailEmailForwardResult;
  email_search: GmailEmailSearchResult;
  email_get: GmailEmailGetResult;
  email_trash: GmailEmailTrashResult;
  email_modify_labels: GmailEmailModifyLabelsResult;
  label_list: GmailLabelListResult;
  label_create: GmailLabelCreateResult;
  draft_create: GmailDraftCreateResult;
  draft_delete: GmailDraftDeleteResult;
  draft_send: GmailDraftSendResult;
  thread_get: GmailThreadGetResult;
  thread_trash: GmailThreadTrashResult;
  message_archive: GmailMessageArchiveResult;
  message_trash: GmailMessageTrashResult;
  message_untrash: GmailMessageUntrashResult;
  message_mark_read: GmailMessageMarkReadResult;
  message_mark_unread: GmailMessageMarkUnreadResult;
  message_star: GmailMessageStarResult;
  message_unstar: GmailMessageUnstarResult;
  message_add_labels: GmailMessageAddLabelsResult;
  message_remove_labels: GmailMessageRemoveLabelsResult;
}
