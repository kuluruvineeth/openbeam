export interface SlackMessageSendResult {
  ts: string | undefined;
  channel: string | undefined;
}

export interface SlackMessageUpdateResult {
  ts: string | undefined;
}

export interface SlackMessageReplyResult {
  ts: string | undefined;
  channel: string | undefined;
}

export interface SlackMessageAddReactionResult {
  ok: true;
}

export interface SlackChannelCreateResult {
  channelId: string | undefined;
}

export interface SlackChannelArchiveResult {
  ok: true;
}

export interface SlackChannelSetTopicResult {
  ok: true;
}

export interface SlackChannelInviteResult {
  ok: true;
}

export interface SlackDmSendResult {
  ts: string | undefined;
  channel: string | undefined;
}

export interface SlackActionResults {
  message_send: SlackMessageSendResult;
  message_update: SlackMessageUpdateResult;
  message_reply: SlackMessageReplyResult;
  message_add_reaction: SlackMessageAddReactionResult;
  channel_create: SlackChannelCreateResult;
  channel_archive: SlackChannelArchiveResult;
  channel_set_topic: SlackChannelSetTopicResult;
  channel_invite: SlackChannelInviteResult;
  dm_send: SlackDmSendResult;
}
