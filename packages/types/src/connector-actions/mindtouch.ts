export interface MindtouchPageCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface MindtouchPageUpdateContentResult {
  id: string | undefined;
  url: string | undefined;
}

export interface MindtouchPageAddTagsResult {
  id: string | undefined;
}

export interface MindtouchActionResults {
  page_create: MindtouchPageCreateResult;
  page_update_content: MindtouchPageUpdateContentResult;
  page_add_tags: MindtouchPageAddTagsResult;
}
