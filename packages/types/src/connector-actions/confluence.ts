export interface ConfluenceSpaceListResult {
  spaces: unknown[];
}

export interface ConfluencePageCreateResult {
  pageId: string | undefined;
  url: string | undefined;
}

export interface ConfluencePageUpdateResult {
  pageId: string | undefined;
}

export interface ConfluencePageArchiveResult {
  archived: true;
}

export interface ConfluenceCommentAddResult {
  commentId: string | undefined;
}

export interface ConfluenceActionResults {
  space_list: ConfluenceSpaceListResult;
  page_create: ConfluencePageCreateResult;
  page_update: ConfluencePageUpdateResult;
  page_archive: ConfluencePageArchiveResult;
  comment_add: ConfluenceCommentAddResult;
}
