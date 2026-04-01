export type SetupStep = "browse" | "oauth" | "apikey" | "success" | "error";

export type AvailableConnector = {
  id: string;
  name: string;
  category: string;
  shortDescription?: string | null;
  authType: string;
  active: boolean;
  installed: boolean;
  requiredFields?: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string | null;
  }>;
};

export type SetupData = {
  setupId?: string;
  connectorId?: string;
  oauthUrl?: string;
  app?: { id: string; name: string };
  expiresAt?: string;
  status?: string;
};

export type PollStatus = "pending" | "completed" | "failed" | "expired";
