export interface SeismicContentUpdateMetadataResult {
  contentId: string | undefined;
  url: string | undefined;
}

export interface SeismicActionResults {
  content_update_metadata: SeismicContentUpdateMetadataResult;
}
