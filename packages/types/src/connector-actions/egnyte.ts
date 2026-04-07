export interface EgnyteFolderCreateResult {
  path: unknown;
  url: string | undefined;
}

export interface EgnyteItemDeleteResult {
  path: unknown;
}

export interface EgnyteSharedLinkCreateResult {
  linkId: string | undefined;
  url: string | undefined;
}

export interface EgnyteActionResults {
  folder_create: EgnyteFolderCreateResult;
  item_delete: EgnyteItemDeleteResult;
  shared_link_create: EgnyteSharedLinkCreateResult;
}
