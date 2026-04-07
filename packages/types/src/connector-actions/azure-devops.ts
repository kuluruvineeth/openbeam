export interface AzureDevopsWorkitemCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface AzureDevopsWorkitemUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface AzureDevopsWorkitemCommentResult {
  id: string | undefined;
}

export interface AzureDevopsActionResults {
  workitem_create: AzureDevopsWorkitemCreateResult;
  workitem_update: AzureDevopsWorkitemUpdateResult;
  workitem_comment: AzureDevopsWorkitemCommentResult;
}
