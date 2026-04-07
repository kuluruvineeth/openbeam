export interface OutlookEmailSendResult {
  sent: true;
}

export interface OutlookEmailReplyResult {
  replied: true;
}

export interface OutlookEmailMoveResult {
  moved: true;
}

export interface OutlookFolderListResult {
  folders: unknown[];
}

export interface OutlookActionResults {
  email_send: OutlookEmailSendResult;
  email_reply: OutlookEmailReplyResult;
  email_move: OutlookEmailMoveResult;
  folder_list: OutlookFolderListResult;
}
