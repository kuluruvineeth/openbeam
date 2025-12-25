import { AuthType } from "../types";
import notionApp from "./config";
import { type NotionAuthResult, NotionOAuthResponseSchema } from "./types";

function getOAuthConfig() {
  if (notionApp.auth.type !== AuthType.OAUTH2) {
    throw new Error("Notion app is not configured for OAuth2");
  }
  return notionApp.auth.config;
}

export interface GenerateNotionAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

export function generateNotionAuthUrl(
  params: GenerateNotionAuthUrlParams
): string {
  const { clientId, redirectUri, state } = params;
  const config = getOAuthConfig();

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("state", state);

  return url.toString();
}

export interface ExchangeNotionCodeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeNotionCode(
  params: ExchangeNotionCodeParams
): Promise<NotionAuthResult> {
  const { clientId, clientSecret, code, redirectUri } = params;
  const config = getOAuthConfig();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Notion OAuth failed: ${res.status} - ${errorText}`);
  }

  const result = NotionOAuthResponseSchema.parse(await res.json());

  const ownerUser =
    result.owner?.type === "user" ? result.owner.user : undefined;

  return {
    accessToken: result.access_token,
    botId: result.bot_id,
    workspaceId: result.workspace_id,
    workspaceName: result.workspace_name,
    workspaceIcon: result.workspace_icon ?? undefined,
    ownerUserId: ownerUser?.id,
    ownerEmail: ownerUser?.person?.email,
  };
}
