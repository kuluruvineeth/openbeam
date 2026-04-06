export interface SlackMessageSendResult {
  ts: string | undefined;
  channel: string | undefined;
}

export interface SlackMessageUpdateResult {
  ts: string | undefined;
}

export interface SlackMessageDeleteResult {
  ok: true;
}

export interface SlackMessageReplyResult {
  ts: string | undefined;
  channel: string | undefined;
}

export interface SlackMessageAddReactionResult {
  ok: true;
}

export interface SlackMessageSearchResult {
  messages: unknown[];
  total: number | undefined;
}

export interface SlackChannelCreateResult {
  channelId: string | undefined;
  name: string;
}

export interface SlackChannelArchiveResult {
  ok: true;
}

export interface SlackChannelSetTopicResult {
  topic: string;
}

export interface SlackChannelInviteResult {
  ok: true;
}

export interface SlackDmSendResult {
  ts: string | undefined;
  channel: string | undefined;
}

export interface SlackUserLookupResult {
  id: string;
  name: string | undefined;
  email: string;
}

export interface SlackFileUploadResult {
  id: string;
  url: string;
}

export interface SlackBookmarkAddResult {
  id: string;
}

export interface SlackActionResults {
  message_send: SlackMessageSendResult;
  message_update: SlackMessageUpdateResult;
  message_delete: SlackMessageDeleteResult;
  message_reply: SlackMessageReplyResult;
  message_add_reaction: SlackMessageAddReactionResult;
  message_search: SlackMessageSearchResult;
  channel_create: SlackChannelCreateResult;
  channel_archive: SlackChannelArchiveResult;
  channel_set_topic: SlackChannelSetTopicResult;
  channel_invite: SlackChannelInviteResult;
  dm_send: SlackDmSendResult;
  user_lookup: SlackUserLookupResult;
  file_upload: SlackFileUploadResult;
  bookmark_add: SlackBookmarkAddResult;
}
