import type { OAuthProvider, OAuthTokens, OAuthUserInfo } from "../types";

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
  token_type: string;
}

interface GoogleUserResponse {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const DEFAULT_SCOPES = ["openid", "profile", "email"];

export function createGoogleProvider(config: GoogleConfig): OAuthProvider {
  const scopes = config.scopes ?? DEFAULT_SCOPES;

  return {
    name: "google",

    getAuthorizationUrl(state: string, redirectUri: string): URL {
      const url = new URL(GOOGLE_AUTH_URL);
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", scopes.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      return url;
    },

    async exchangeCode(
      code: string,
      redirectUri: string
    ): Promise<OAuthTokens> {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google token exchange failed: ${error}`);
      }

      const data = (await response.json()) as GoogleTokenResponse;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
        scope: data.scope,
      };
    },

    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google userinfo fetch failed: ${error}`);
      }

      const data = (await response.json()) as GoogleUserResponse;

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.picture,
        emailVerified: data.verified_email,
      };
    },
  };
}
