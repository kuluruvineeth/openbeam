export interface LookerStudioReportMetadataResult {
  reportId: string | undefined;
  url: string | undefined;
}

export interface LookerStudioActionResults {
  report_metadata: LookerStudioReportMetadataResult;
}
