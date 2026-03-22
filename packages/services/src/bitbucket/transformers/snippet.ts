import type {
  BitbucketSnippet,
  BitbucketTransformContext,
} from "@openbeam/types/services/connectors/bitbucket";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildSnippetContent(snippet: BitbucketSnippet): string {
  const parts: string[] = [];

  parts.push(`Visibility: ${snippet.is_private ? "private" : "public"}`);

  if (snippet.owner) {
    parts.push(`Owner: ${snippet.owner.display_name}`);
  }

  return parts.join("\n");
}

function buildSnippetMetadata(
  snippet: BitbucketSnippet
): GenericDocument["metadata"] {
  return {
    snippetId: snippet.id,
    isPrivate: snippet.is_private,
    ownerName: snippet.owner?.display_name ?? "",
    creatorName: snippet.creator?.display_name ?? "",
  };
}

export async function transformSnippet(
  snippet: BitbucketSnippet,
  context: BitbucketTransformContext
): Promise<GenericDocument> {
  const title = snippet.title;
  const content = buildSnippetContent(snippet);
  const metadata = buildSnippetMetadata(snippet);
  const url =
    snippet.links?.html?.href ??
    `https://bitbucket.org/${context.workspaceSlug}/snippets/${snippet.id}`;

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_snippet_${snippet.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `snippet_${snippet.id}`,
    document_type: "snippet",
    document_subtype: snippet.is_private ? "private" : "public",
    title,
    content,
    author_id: snippet.creator?.uuid ?? snippet.owner?.uuid,
    author_name: snippet.creator?.display_name ?? snippet.owner?.display_name,
    author_avatar_url:
      snippet.creator?.links?.avatar?.href ??
      snippet.owner?.links?.avatar?.href,
    created_at: new Date(snippet.created_on).getTime(),
    updated_at: new Date(snippet.updated_on).getTime(),
    source_id: context.workspaceSlug,
    source_type: "bitbucket",
    source_name: context.workspaceSlug,
    url,
    is_public: !snippet.is_private,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
