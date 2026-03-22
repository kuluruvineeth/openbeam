import {
  IntercomMeSchema,
  type IntercomOAuthResult,
  IntercomTokenResponseSchema,
} from "./types";

export class IntercomOAuthError extends Error {
  readonly operation: "exchange" | "userinfo";
  readonly statusCode: number;

  constructor(
    operation: "exchange" | "userinfo",
    statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "IntercomOAuthError";
    this.operation = operation;
    this.statusCode = statusCode;
  }
}

export type GenerateIntercomAuthUrlParams = {
  clientId: string;
  redirectUri: string;
  state: string;
};

export function generateIntercomAuthUrl(
  params: GenerateIntercomAuthUrlParams
): string {
  const { clientId, redirectUri, state } = params;

  const url = new URL("https://app.intercom.com/oauth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export type ExchangeIntercomCodeParams = {
  clientId: string;
  clientSecret: string;
  code: string;
};

export async function exchangeIntercomCode(
  params: ExchangeIntercomCodeParams
): Promise<IntercomOAuthResult> {
  const { clientId, clientSecret, code } = params;

  const tokenResponse = await fetch(
    "https://api.intercom.io/auth/eagle/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new IntercomOAuthError(
      "exchange",
      tokenResponse.status,
      `Token exchange failed: ${errorText}`
    );
  }

  const tokens = IntercomTokenResponseSchema.parse(await tokenResponse.json());

  const me = await fetchIntercomMe(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    adminId: me.id,
    adminEmail: me.email,
    adminName: me.name,
    appId: me.app?.id_code,
    workspaceName: me.app?.name,
  };
}

async function fetchIntercomMe(accessToken: string) {
  const response = await fetch("https://api.intercom.io/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Intercom-Version": "2.11",
    },
  });

  if (!response.ok) {
    throw new IntercomOAuthError(
      "userinfo",
      response.status,
      `Admin info fetch failed: ${response.status}`
    );
  }

  return IntercomMeSchema.parse(await response.json());
}
