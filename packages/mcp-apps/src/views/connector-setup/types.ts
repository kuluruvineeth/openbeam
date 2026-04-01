export type SetupStep = "browse" | "oauth" | "success" | "error";

export type AvailableConnector = {
  id: string;
  name: string;
  category: string;
  shortDescription?: string | null;
  authType: string;
  active: boolean;
  installed: boolean;
};

export type SetupData = {
  setupId?: string;
  connectorId?: string;
  oauthUrl?: string;
  app?: { id: string; name: string };
  expiresAt?: string;
};

export type PollStatus = "pending" | "completed" | "failed" | "expired";
