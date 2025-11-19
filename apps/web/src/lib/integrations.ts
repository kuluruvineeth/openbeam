import {
  type AuthConfig,
  AuthType,
  ConnectorType,
  type UnifiedApp,
} from "@openplane/integrations";
import { z } from "zod";

// Mock data types until TRPC is ready
export type ExternalApp = {
  id: string;
  name: string;
  status: string;
  active?: boolean;
  logoUrl?: string | null;
  description?: string | null;
  overview?: string | null;
  screenshots?: string[];
  clientId?: string | null;
  scopes?: string[];
  developerName?: string | null;
  website?: string | null;
  installUrl?: string | null;
  createdAt?: string;
};

export type AuthorizedApp = {
  id: string;
  lastUsedAt?: string;
};

export function generateFormSchema(settings: UnifiedApp["settings"]) {
  const schemaMap: Record<string, z.ZodTypeAny> = {};
  if (settings) {
    for (const setting of settings) {
      if (setting.type === "switch") {
        schemaMap[setting.id] = z.boolean().default(false);
      } else if (setting.required) {
        schemaMap[setting.id] = z.string().min(1, {
          message: `${setting.label} is required`,
        });
      } else {
        schemaMap[setting.id] = z.string().optional();
      }
    }
  }
  return z.object(schemaMap);
}

export function getAppDefaultValues(app: UnifiedApp) {
  const defaults: Record<string, string | boolean> = {};
  if (app.settings) {
    for (const setting of app.settings) {
      const savedValue = app.userSettings?.[setting.id];
      defaults[setting.id] =
        savedValue ?? setting.value ?? (setting.type === "switch" ? false : "");
    }
  }
  return defaults;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Transformation logic is complex
export function transformExternalApp(
  app: ExternalApp,
  authorizedExternalApps: { data: AuthorizedApp[] }
): UnifiedApp {
  const isInstalled =
    authorizedExternalApps?.data?.some(
      (authorized) => authorized.id === app.id
    ) ?? false;

  const lastUsedAt =
    authorizedExternalApps?.data?.find((authorized) => authorized.id === app.id)
      ?.lastUsedAt || undefined;

  const authConfig: AuthConfig = {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "",
      tokenUrl: "",
      scopes: app.scopes || [],
    },
  };

  return {
    // biome-ignore lint/suspicious/noExplicitAny: data type varies
    id: app.id as any,
    name: app.name,
    category: "Integration",
    active: app.active ?? false,
    logo: app.logoUrl || undefined,
    short_description: app.description || undefined,
    description: app.overview || app.description || undefined,
    images: app.screenshots || [],
    installed: isInstalled,
    type: "external" as const,
    connectorType: ConnectorType.SOURCE,
    features: [],
    auth: authConfig,
    streams: [],
    clientId: app.clientId || undefined,
    developerName: app.developerName || undefined,
    website: app.website || undefined,
    installUrl: app.installUrl || undefined,
    screenshots: app.screenshots || undefined,
    overview: app.overview || undefined,
    createdAt: app.createdAt || undefined,
    // biome-ignore lint/suspicious/noExplicitAny: data type varies
    status: (app.status as any) || undefined,
    lastUsedAt,
  };
}
