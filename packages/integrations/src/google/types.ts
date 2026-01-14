import { z } from "zod";

const OAuthAppConfigSchema = z.object({
  client_id: z.string(),
  project_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
  client_secret: z.string(),
  redirect_uris: z.array(z.string()).optional(),
});

export const OAuthCredentialsFileSchema = z.object({
  web: OAuthAppConfigSchema.optional(),
  installed: OAuthAppConfigSchema.optional(),
});

export type OAuthCredentialsFile = z.infer<typeof OAuthCredentialsFileSchema>;

export function parseOAuthCredentialsFile(json: string) {
  const data = OAuthCredentialsFileSchema.parse(JSON.parse(json));
  const config = data.web ?? data.installed;

  if (!config) {
    throw new Error('Missing "web" or "installed" in credentials file');
  }

  return {
    clientId: config.client_id,
    clientSecret: config.client_secret,
    projectId: config.project_id,
  };
}

export const ServiceAccountCredentialsSchema = z.object({
  type: z.literal("service_account"),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string(),
  client_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
  auth_provider_x509_cert_url: z.string(),
  client_x509_cert_url: z.string(),
});

export type ServiceAccountCredentials = z.infer<
  typeof ServiceAccountCredentialsSchema
>;

export function parseServiceAccountCredentials(json: string) {
  return ServiceAccountCredentialsSchema.parse(JSON.parse(json));
}

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const UserInfoSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
  hd: z.string().optional(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

export type GoogleOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
  userEmail: string;
  userId: string;
  hostedDomain?: string;
};

export type GoogleServiceAccountResult = {
  accessToken: string;
  expiresIn: number;
  serviceAccountEmail: string;
  delegatedUserEmail: string;
  projectId: string;
};

export type GoogleAuthMethod = "oauth" | "service_account";

export type GoogleOAuthConfig = {
  authMethod: "oauth";
  accessToken: string;
  refreshToken?: string;
  email: string;
};

export type GoogleServiceAccountConfig = {
  authMethod: "service_account";
  credentials: ServiceAccountCredentials;
  delegatedEmail: string;
};

export type GoogleAuthConfig = GoogleOAuthConfig | GoogleServiceAccountConfig;
