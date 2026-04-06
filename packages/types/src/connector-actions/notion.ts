export interface NotionDatabaseListResult {
  databases: unknown[];
}

export interface NotionPageSearchResult {
  pages: unknown[];
}

export interface NotionPageCreateResult {
  pageId: string | undefined;
  url: string | undefined;
}

export interface NotionPageUpdateResult {
  pageId: string | undefined;
  url: string | undefined;
}

export interface NotionPageArchiveResult {
  pageId: string | undefined;
}

export interface NotionPageRestoreResult {
  pageId: string | undefined;
}

export interface NotionDatabaseEntryCreateResult {
  databaseId: string | undefined;
  pageId: string | undefined;
  url: string | undefined;
}

export interface NotionDatabaseEntryUpdateResult {
  pageId: string | undefined;
  url: string | undefined;
}

export interface NotionBlockAppendResult {
  blockIds: string[] | undefined;
}

export interface NotionBlockUpdateResult {
  blockId: string | undefined;
}

export interface NotionBlockDeleteResult {
  blockId: string | undefined;
}

export interface NotionCommentAddPageResult {
  commentId: string | undefined;
}

export interface NotionCommentAddBlockResult {
  commentId: string | undefined;
}

export interface NotionActionResults {
  database_list: NotionDatabaseListResult;
  page_search: NotionPageSearchResult;
  page_create: NotionPageCreateResult;
  page_update: NotionPageUpdateResult;
  page_archive: NotionPageArchiveResult;
  page_restore: NotionPageRestoreResult;
  database_entry_create: NotionDatabaseEntryCreateResult;
  database_entry_update: NotionDatabaseEntryUpdateResult;
  block_append: NotionBlockAppendResult;
  block_update: NotionBlockUpdateResult;
  block_delete: NotionBlockDeleteResult;
  comment_add_page: NotionCommentAddPageResult;
  comment_add_block: NotionCommentAddBlockResult;
}
