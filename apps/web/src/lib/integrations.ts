import {
  type AuthConfig,
  AuthType,
  ConnectorType,
  type UnifiedApp,
} from "@openbeam/integrations";
import { z } from "zod/v3";

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

type Setting = NonNullable<UnifiedApp["settings"]>[number];

function getFieldSchema(setting: Setting): z.ZodTypeAny {
  if (setting.type === "switch") {
    return z.boolean().default(false);
  }
  if (setting.type === "number") {
    return z.coerce.number().optional();
  }
  if (setting.required && !setting.dependsOn) {
    return z.string().min(1, { message: `${setting.label} is required` });
  }
  return z.string().optional();
}

function buildSchemaMap(settings: Setting[]): Record<string, z.ZodTypeAny> {
  const schemaMap: Record<string, z.ZodTypeAny> = {};
  for (const setting of settings) {
    schemaMap[setting.id] = getFieldSchema(setting);
  }
  return schemaMap;
}

export function generateFormSchema(settings: UnifiedApp["settings"]) {
  const schemaMap = settings ? buildSchemaMap(settings) : {};
  const baseSchema = z.object(schemaMap);

  const conditionalFields = settings?.filter((s) => s.required && s.dependsOn);
  if (!conditionalFields?.length) {
    return baseSchema;
  }

  return baseSchema.superRefine((data, ctx) => {
    for (const setting of conditionalFields) {
      const conditions = Array.isArray(setting.dependsOn)
        ? setting.dependsOn
        : [setting.dependsOn];

      const shouldBeRequired = conditions.every(
        (c) => c && data[c.field] === c.value
      );

      if (shouldBeRequired && !data[setting.id]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${setting.label} is required`,
          path: [setting.id],
        });
      }
    }
  });
}

export function getAppDefaultValues(app: UnifiedApp) {
  const defaults: Record<string, string | number | boolean> = {};
  if (app.settings) {
    for (const setting of app.settings) {
      const savedValue = app.userSettings?.[setting.id];
      defaults[setting.id] =
        savedValue ?? setting.value ?? (setting.type === "switch" ? false : "");
    }
  }
  return defaults;
}

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
