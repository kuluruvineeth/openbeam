export type SlackReaction = {
  name: string;
  count: number;
  users?: string[];
};

export type SlackFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  url?: string;
  thumbnailUrl?: string;
};

export type SlackMetadata = {
  reactions?: SlackReaction[];
  files?: SlackFile[];
  blocks?: unknown[];
  channelId?: string;
  channelName?: string;
  threadTs?: string;
  parentTs?: string;
};

export type SlackMessage = {
  id: string;
  threadId?: string;
  content?: string;
  contentHtml?: string;
  authorName?: string;
  authorId?: string;
  authorAvatarUrl?: string;
  createdAt: number;
  replyCount?: number;
  reactionCount?: number;
  metadata?: SlackMetadata;
  url?: string;
};

export type SlackThread = {
  id: string;
  channelId: string;
  channelName?: string;
  parent: SlackMessage;
  replies: SlackMessage[];
  replyCount: number;
  participantCount: number;
  url?: string;
};
