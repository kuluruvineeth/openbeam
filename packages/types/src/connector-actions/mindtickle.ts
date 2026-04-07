export interface MindtickleMissionCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface MindtickleContentUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface MindtickleUserInviteResult {
  id: string | undefined;
}

export interface MindtickleUserGetResult {
  id: string | undefined;
  user: unknown;
}

export interface MindtickleActionResults {
  mission_create: MindtickleMissionCreateResult;
  content_update: MindtickleContentUpdateResult;
  user_invite: MindtickleUserInviteResult;
  user_get: MindtickleUserGetResult;
}
