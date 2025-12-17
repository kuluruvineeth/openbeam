export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  scope?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
}

export interface OAuthProvider {
  readonly name: string;
  getAuthorizationUrl(state: string, redirectUri: string): URL;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export interface OAuthState {
  provider: string;
  callbackUrl: string;
  nonce: string;
}
