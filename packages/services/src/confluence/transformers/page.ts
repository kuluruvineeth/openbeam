import type { ConfluenceTransformContext } from "@openbeam/types/services/connectors/confluence";
import type { GenericDocument } from "@openbeam/vespa";

export type ConfluencePage = {
  id: string;
  status: string;
  title: string;
  spaceId: string;
  parentId?: string;
  parentType?: string;
  authorId?: string;
  createdAt: string;
  version?: {
    number: number;
    message?: string;
    createdAt: string;
    authorId?: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
  };
  _links?: {
    webui?: string;
    tinyui?: string;
  };
  labels?: {
    results?: Array<{ name: string }>;
  };
};

export type ConfluenceBlogpost = ConfluencePage;

export type ConfluenceSpaceInfo = {
  key: string;
  name: string;
};

function stripXhtml(xhtml: string): string {
  return xhtml
    .replace(/<ac:[^>]*\/>/gi, "")
    .replace(/<ac:[^>]*>[\s\S]*?<\/ac:[^>]+>/gi, "")
    .replace(/<ri:[^>]*\/>/gi, "")
    .replace(/<ri:[^>]*>[\s\S]*?<\/ri:[^>]+>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function transformConfluencePage(
  page: ConfluencePage,
  context: ConfluenceTransformContext,
  space?: ConfluenceSpaceInfo,
  documentType: "page" | "blogpost" = "page"
): GenericDocument {
  const content = page.body?.storage?.value
    ? stripXhtml(page.body.storage.value)
    : "";

  const createdAt = new Date(page.createdAt).getTime();
  const updatedAt = page.version?.createdAt
    ? new Date(page.version.createdAt).getTime()
    : createdAt;

  const authorId = page.version?.authorId ?? page.authorId;
  const labels = page.labels?.results?.map((l) => l.name).filter(Boolean) ?? [];

  const webUrl = page._links?.webui
    ? `${context.siteUrl}/wiki${page._links.webui}`
    : `${context.siteUrl}/wiki/spaces/${space?.key ?? ""}`;

  return {
    id: `${context.connectorId}_${documentType}_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page.id,
    document_type: documentType,
    document_subtype: documentType,
    title: page.title || "(Untitled)",
    content,
    author_id: authorId,
    created_at: createdAt,
    updated_at: updatedAt,
    url: webUrl,
    is_public: false,
    access_control: [],
    metadata: {
      spaceId: page.spaceId,
      ...(space && { spaceKey: space.key, spaceName: space.name }),
      status: page.status,
      ...(page.version && { version: page.version.number }),
      ...(labels.length > 0 && { labels: labels.join(", ") }),
    },
  };
}
