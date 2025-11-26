/**
 * OAuth Callback API Route
 * Handles OAuth code exchange for any connector provider
 *
 * This is a catch-all handler that:
 * 1. Receives the OAuth code from the frontend
 * 2. Exchanges it for tokens using provider-specific logic
 * 3. Creates/updates the connector in the database
 * 4. Returns the connector ID
 */

import { type NextRequest, NextResponse } from "next/server";

// Provider-specific OAuth configurations
const OAUTH_CONFIGS: Record<
  string,
  {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes?: string[];
  }
> = {
  google: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  slack: {
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
  },
  notion: {
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientId: process.env.NOTION_CLIENT_ID || "",
    clientSecret: process.env.NOTION_CLIENT_SECRET || "",
  },
  confluence: {
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    clientId: process.env.ATLASSIAN_CLIENT_ID || "",
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET || "",
  },
  github: {
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  },
  microsoft: {
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  },
  dropbox: {
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    clientId: process.env.DROPBOX_CLIENT_ID || "",
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || "",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, code, state: _state } = body;

    if (!(provider && code)) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const config = OAUTH_CONFIGS[provider.toLowerCase()];

    if (!config) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    if (!(config.clientId && config.clientSecret)) {
      return NextResponse.json(
        { error: `${provider} OAuth not configured` },
        { status: 500 }
      );
    }

    // Build the token exchange request
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/connectors/oauth/${provider}/callback`;

    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Token exchange failed:", errorData);
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 400 }
      );
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // TODO: Store the tokens and create connector in database
    // This would typically call your backend service to save tokens
    console.log("OAuth tokens received for", provider, {
      hasAccessToken: Boolean(tokens.access_token),
      hasRefreshToken: Boolean(tokens.refresh_token),
      expiresIn: tokens.expires_in,
    });

    // For now, return success with a placeholder
    return NextResponse.json({
      success: true,
      connectorId: `${provider}-${Date.now()}`,
      message:
        "OAuth tokens received. Connector creation pending implementation.",
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
