export interface GmailEmailSendResult {
  messageId: string | undefined;
  threadId: string | undefined;
}

export interface GmailEmailReplyResult {
  messageId: string | undefined;
  threadId: string | undefined;
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
  draft_create: GmailDraftCreateResult;
  draft_delete: GmailDraftDeleteResult;
  draft_send: GmailDraftSendResult;
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
