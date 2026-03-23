export type OneNoteConfig = {
  client_id?: string;
  client_secret?: string;
  tenant_id?: string;
  include_notebooks?: string;
  exclude_notebooks?: string;
  sync_page_content?: boolean;
  lookback_days?: string;
  userEmail?: string;
  [key: string]: unknown;
};
