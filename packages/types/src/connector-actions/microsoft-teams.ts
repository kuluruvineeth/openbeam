export interface MicrosoftTeamsTeamListResult {
  teams: unknown[];
}

export interface MicrosoftTeamsChannelListResult {
  channels: unknown[];
}

export interface MicrosoftTeamsMessageSendResult {
  messageId: string | undefined;
}

export interface MicrosoftTeamsMessageReplyResult {
  messageId: string | undefined;
}

export interface MicrosoftTeamsActionResults {
  team_list: MicrosoftTeamsTeamListResult;
  channel_list: MicrosoftTeamsChannelListResult;
  message_send: MicrosoftTeamsMessageSendResult;
  message_reply: MicrosoftTeamsMessageReplyResult;
}
