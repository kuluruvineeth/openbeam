export interface GoogleChatMessageSendResult {
  messageId: string | undefined;
}

export interface GoogleChatSpaceListResult {
  spaces: unknown[];
}

export interface GoogleChatActionResults {
  message_send: GoogleChatMessageSendResult;
  space_list: GoogleChatSpaceListResult;
}
