import type {
  GitHubDiscussion,
  GitHubTransformContext,
} from "@openplane/types/services/connectors/github";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface DiscussionTransformOptions {
  repoFullName: string;
  isRepoPrivate: boolean;
}

function buildDiscussionDocumentId(
  connectorId: string,
  discussionId: string
): string {
  return `${connectorId}_discussion_${discussionId}`;
}

function buildDiscussionContent(
  discussion: GitHubDiscussion,
  _options: DiscussionTransformOptions
): string {
  const parts: string[] = [];

  parts.push(discussion.body);
  parts.push(`Category: ${discussion.category.name}`);

  if (discussion.answer) {
    parts.push("\n--- Accepted Answer ---");
    const answerAuthor = discussion.answer.author?.login ?? "unknown";
    parts.push(`${answerAuthor}: ${discussion.answer.body}`);
  }

  return parts.join("\n");
}

function buildDiscussionMetadata(
  discussion: GitHubDiscussion,
  options: DiscussionTransformOptions
): GenericDocument["metadata"] {
  return {
    discussionId: discussion.id,
    number: discussion.number,
    repoFullName: options.repoFullName,
    categoryId: discussion.category.id,
    categoryName: discussion.category.name,
    hasAnswer: !!discussion.answer,
    commentCount: discussion.comments.totalCount,
  };
}

export async function transformDiscussion(
  discussion: GitHubDiscussion,
  context: GitHubTransformContext,
  options: DiscussionTransformOptions
): Promise<GenericDocument> {
  const title = `Discussion #${discussion.number}: ${discussion.title}`;
  const content = buildDiscussionContent(discussion, options);
  const authorLogin = discussion.author?.login;
  const authorName = authorLogin
    ? (context.userLookup?.getName(authorLogin) ?? authorLogin)
    : undefined;
  const authorUser = authorLogin
    ? context.userLookup?.get(authorLogin)
    : undefined;
  const authorAvatar = authorLogin
    ? (context.userLookup?.getAvatar(authorLogin) ??
      discussion.author?.avatarUrl)
    : undefined;

  const metadata = buildDiscussionMetadata(discussion, options);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: buildDiscussionDocumentId(context.connectorId, discussion.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: discussion.id,
    document_type: "discussion",
    title,
    content,
    author_id: authorUser ? String(authorUser.id) : undefined,
    author_name: authorName,
    author_avatar_url: authorAvatar,
    created_at: new Date(discussion.createdAt).getTime(),
    updated_at: new Date(discussion.updatedAt).getTime(),
    source_id: options.repoFullName,
    source_type: "github",
    source_name: context.organizationName,
    url: discussion.url,
    is_public: !options.isRepoPrivate,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
