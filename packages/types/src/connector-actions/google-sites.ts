export interface GoogleSitesSiteMetadataResult {
  siteId: string | undefined;
  url: string | undefined;
}

export interface GoogleSitesActionResults {
  site_metadata: GoogleSitesSiteMetadataResult;
}
