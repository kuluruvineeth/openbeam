import { apiClient } from "@/lib/api-client";

export interface OAuthCallbackResponse {
  success: boolean;
  connectorId?: string;
  message?: string;
  redirect_on_success?: string;
  finalize_url?: string;
}

type IntegrationName =
  | "slack"
  | "gmail"
  | "google-drive"
  | "google-chat"
  | "notion"
  | "linear"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "microsoft-calendar"
  | "servicenow"
  | "zendesk"
  | "dropbox"
  | "box"
  | "asana"
  | "hubspot"
  | "figma"
  | "intercom"
  | "zoom"
  | "monday"
  | "clickup"
  | "azure-devops"
  | "workday"
  | "pipedrive"
  | "airtable"
  | "onenote"
  | "miro"
  | "dynamics365"
  | "docusign"
  | "canva";

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
  "google-chat": async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>(
      "/integrations/google-chat/callback",
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
  linear: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/linear/callback", {
      code,
      state,
    }),
  github: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/github/callback", {
      code,
      state,
    }),
  gitlab: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/gitlab/callback", {
      code,
      state,
    }),
  "microsoft-calendar": async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>(
      "/integrations/microsoft-calendar/callback",
      {
        code,
        state,
      }
    ),
  servicenow: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/servicenow/callback", {
      code,
      state,
    }),
  zendesk: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/zendesk/callback", {
      code,
      state,
    }),
  dropbox: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/dropbox/callback", {
      code,
      state,
    }),
  box: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/box/callback", {
      code,
      state,
    }),
  asana: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/asana/callback", {
      code,
      state,
    }),
  hubspot: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/hubspot/callback", {
      code,
      state,
    }),
  figma: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/figma/callback", {
      code,
      state,
    }),
  intercom: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/intercom/callback", {
      code,
      state,
    }),
  zoom: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/zoom/callback", {
      code,
      state,
    }),
  bitbucket: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/bitbucket/callback", {
      code,
      state,
    }),
  monday: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/monday/callback", {
      code,
      state,
    }),
  clickup: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/clickup/callback", {
      code,
      state,
    }),
  "azure-devops": async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>(
      "/integrations/azure-devops/callback",
      {
        code,
        state,
      }
    ),
  workday: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/workday/callback", {
      code,
      state,
    }),
  pipedrive: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/pipedrive/callback", {
      code,
      state,
    }),
  airtable: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/airtable/callback", {
      code,
      state,
    }),
  onenote: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/onenote/callback", {
      code,
      state,
    }),
  miro: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/miro/callback", {
      code,
      state,
    }),
  dynamics365: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>(
      "/integrations/dynamics365/callback",
      {
        code,
        state,
      }
    ),
  docusign: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/docusign/callback", {
      code,
      state,
    }),
  canva: async (code: string, state: string) =>
    apiClient.post<OAuthCallbackResponse>("/integrations/canva/callback", {
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
