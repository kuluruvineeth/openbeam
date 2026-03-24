export type GoogleSitesAuthMethod = "oauth" | "service_account";

export type GoogleSitesConfig = {
  client_id?: string;
  client_secret?: string;
  oauth_credentials_file?: string;
  oauth_input_method?: "file" | "manual";
  userEmail?: string;
  domain?: string;
  include_sites?: string;
  exclude_sites?: string;
  [key: string]: unknown;
};
