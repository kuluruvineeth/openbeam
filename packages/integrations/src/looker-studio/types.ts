export type LookerStudioAuthMethod = "oauth" | "service_account";

export type LookerStudioConfig = {
  client_id?: string;
  client_secret?: string;
  oauth_credentials_file?: string;
  oauth_input_method?: "file" | "manual";
  userEmail?: string;
  domain?: string;
  [key: string]: unknown;
};
