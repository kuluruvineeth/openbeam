import { z } from "zod";
import {
  type ConnectorEventConfig,
  defineConnectorEvents,
} from "../common/events";

export const GITHUB_EVENT_IDS = [
  "repository.created",
  "repository.archived",
  "issue.opened",
  "issue.closed",
  "issue.reopened",
  "pull_request.opened",
  "pull_request.closed",
  "pull_request.merged",
  "comment.created",
  "release.published",
  "push.received",
] as const;

export type GitHubEventId = (typeof GITHUB_EVENT_IDS)[number];

export const GITHUB_EVENTS = defineConnectorEvents<
  GitHubEventId,
  readonly ConnectorEventConfig<GitHubEventId>[]
>([
  {
    id: "repository.created",
    name: "Repository Created",
    description: "Triggered when a repository is created",
    category: "documents",
    isRealtime: true,
  },
  {
    id: "repository.archived",
    name: "Repository Archived",
    description: "Triggered when a repository is archived",
    category: "documents",
    isRealtime: true,
  },
  {
    id: "issue.opened",
    name: "Issue Opened",
    description: "Triggered when an issue is opened",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "issue.closed",
    name: "Issue Closed",
    description: "Triggered when an issue is closed",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "issue.reopened",
    name: "Issue Reopened",
    description: "Triggered when an issue is reopened",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "pull_request.opened",
    name: "Pull Request Opened",
    description: "Triggered when a pull request is opened",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "pull_request.closed",
    name: "Pull Request Closed",
    description: "Triggered when a pull request is closed",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "pull_request.merged",
    name: "Pull Request Merged",
    description: "Triggered when a pull request is merged",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "comment.created",
    name: "Comment Created",
    description: "Triggered when an issue or pull request comment is created",
    category: "comments",
    isRealtime: true,
  },
  {
    id: "release.published",
    name: "Release Published",
    description: "Triggered when a release is published",
    category: "documents",
    isRealtime: true,
  },
  {
    id: "push.received",
    name: "Push Received",
    description: "Triggered when commits are pushed to a repository",
    category: "other",
    isRealtime: true,
  },
]);

export const GitHubEventIdSchema = z.enum(GITHUB_EVENT_IDS);
