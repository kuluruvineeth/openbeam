export interface LumappsContentCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LumappsContentUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LumappsPostCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LumappsActionResults {
  content_create: LumappsContentCreateResult;
  content_update: LumappsContentUpdateResult;
  post_create: LumappsPostCreateResult;
}
