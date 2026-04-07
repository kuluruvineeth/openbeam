export interface ZoomUserListResult {
  users: unknown[];
}

export interface ZoomMeetingCreateResult {
  meetingId: string | undefined;
  joinUrl: unknown;
}

export interface ZoomMeetingUpdateResult {
  meetingId: string | undefined;
}

export interface ZoomMeetingDeleteResult {
  deleted: true;
}

export interface ZoomActionResults {
  user_list: ZoomUserListResult;
  meeting_create: ZoomMeetingCreateResult;
  meeting_update: ZoomMeetingUpdateResult;
  meeting_delete: ZoomMeetingDeleteResult;
}
