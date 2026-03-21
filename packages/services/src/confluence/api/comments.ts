import type { AtlassianClient } from "../../atlassian/client";

export type ConfluenceComment = {
  id: string;
  status: string;
  title: string;
  pageId?: string;
  blogPostId?: string;
  body?: { storage?: { value: string } };
  version?: { number: number; createdAt: string; authorId?: string };
  createdAt?: string;
  authorId?: string;
};

type CreateCommentRequest = {
  pageId: string;
  body: { representation: string; value: string };
};

export function listPageComments(
  client: AtlassianClient,
  pageId: string,
  options?: { pageSize?: number }
): AsyncGenerator<ConfluenceComment[], void, undefined> {
  return client.paginate<ConfluenceComment>(
    `/wiki/api/v2/pages/${pageId}/footer-comments`,
    { "body-format": "storage" },
    { pageSize: options?.pageSize ?? 100 }
  );
}

export function listBlogpostComments(
  client: AtlassianClient,
  blogpostId: string,
  options?: { pageSize?: number }
): AsyncGenerator<ConfluenceComment[], void, undefined> {
  return client.paginate<ConfluenceComment>(
    `/wiki/api/v2/blogposts/${blogpostId}/footer-comments`,
    { "body-format": "storage" },
    { pageSize: options?.pageSize ?? 100 }
  );
}

export function createPageComment(
  client: AtlassianClient,
  params: CreateCommentRequest
): Promise<ConfluenceComment> {
  return client.post<ConfluenceComment>("/wiki/api/v2/footer-comments", {
    pageId: params.pageId,
    body: params.body,
  });
}
