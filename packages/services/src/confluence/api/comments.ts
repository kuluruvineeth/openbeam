import type { AtlassianClient } from "../../atlassian/client";

type ConfluenceComment = {
  id: string;
  status: string;
  title: string;
  body?: { storage?: { value: string } };
  version?: { number: number; createdAt: string };
};

type CreateCommentRequest = {
  pageId: string;
  body: { representation: string; value: string };
};

export function createPageComment(
  client: AtlassianClient,
  params: CreateCommentRequest
): Promise<ConfluenceComment> {
  return client.post<ConfluenceComment>("/wiki/api/v2/footer-comments", {
    pageId: params.pageId,
    body: params.body,
  });
}
