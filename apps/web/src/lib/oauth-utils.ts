import { apiClient } from "./api-client";

export interface OAuthCallbackResponse {
  success: boolean;
  connectorId?: string;
  message?: string;
  redirect_on_success?: string;
  finalize_url?: string;
}

type IntegrationName = "slack" | "gmail" | "google-drive" | "notion";

const INTEGRATION_HANDLERS: Record<
  IntegrationName,
  (code: string, state: string) => Promise<OAuthCallbackResponse>
> = {
  slack: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/slack/callback", {
      code,
      state,
    }),
  gmail: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/gmail/callback", {
      code,
      state,
    }),
  "google-drive": async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>(
      "/integrations/google-drive/callback",
      {
        code,
        state,
      }
    ),
  notion: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/notion/callback", {
      code,
      state,
    }),
};

export async function handleOAuthAuthorizationResponse(
  integration: string,
  code: string,
  state: string
): Promise<OAuthCallbackResponse> {
  const handler = INTEGRATION_HANDLERS[integration as IntegrationName];

  if (!handler) {
    throw new Error(`Unsupported integration: ${integration}`);
  }

  return await handler(code, state);
}
