import { z } from "zod";
import { DocumentTypeCategorySchema } from "../connectors/document-types";
import {
  AppTypeSchema,
  ConnectorTypeSchema,
  SyncModeSchema,
} from "../connectors/enums";

export type LogoProps = {
  size?: number;
  className?: string;
};

export type LogoComponent = (props: LogoProps) => unknown;

export type SecretRef = {
  secretName: string;
};

export const DocumentTypeDisplaySchema = z.object({
  label: z.string(),
  iconKey: z.string(),
  category: DocumentTypeCategorySchema,
});

export type DocumentTypeDisplay = z.infer<typeof DocumentTypeDisplaySchema>;

export const SearchDisplayConfigSchema = z.object({
  defaultIconKey: z.string(),
  documentTypes: z.record(z.string(), DocumentTypeDisplaySchema),
  mimeTypes: z.record(z.string(), DocumentTypeDisplaySchema).optional(),
  contentPrimaryDocTypes: z.array(z.string()).optional(),
});

export type SearchDisplayConfig = z.infer<typeof SearchDisplayConfigSchema> & {
  formatSourceName?: (sourceName: string, sourceType?: string) => string;
};

export const StreamDefinitionSchema = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  entityType: z.enum(["resource", "activity", "identity"]),
  dataPoints: z.array(z.string()),
  isPii: z.boolean().optional(),
  syncMode: SyncModeSchema,
  defaultInterval: z.number().optional(),
  supportsBackfill: z.boolean().optional(),
  rateLimit: z.number().optional(),
});

export type StreamDefinition = z.infer<typeof StreamDefinitionSchema>;

export const SettingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export type SettingValue = z.infer<typeof SettingValueSchema>;

export const SettingDependencySchema = z.object({
  field: z.string(),
  value: SettingValueSchema,
});

export type SettingDependency = z.infer<typeof SettingDependencySchema>;

export const AppSettingsItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  type: z.enum([
    "text",
    "password",
    "switch",
    "select",
    "number",
    "file",
    "textarea",
  ]),
  required: z.boolean(),
  value: SettingValueSchema,
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
  placeholder: z.string().optional(),
  enabled: z.boolean().optional(),
  dependsOn: z
    .union([SettingDependencySchema, z.array(SettingDependencySchema)])
    .optional(),
  accept: z.string().optional(),
  fileType: z.enum(["json", "pem", "any"]).optional(),
  rows: z.number().optional(),
});

export type AppSettingsItem = z.infer<typeof AppSettingsItemSchema>;

export const UnifiedAppBaseSchema = z.object({
  id: AppTypeSchema,
  name: z.string(),
  category: z.string(),
  active: z.boolean(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()),
  installed: z.boolean(),
  type: z.enum(["official", "external"]),
  connectorType: ConnectorTypeSchema,
  connectorId: z.string().optional(),
  clientId: z.string().optional(),
  status: z
    .enum(["ACTIVE", "CONNECTING", "ERROR", "INACTIVE", "SYNCING"])
    .optional(),
  features: z.array(z.string()),
  streams: z.array(StreamDefinitionSchema),
  settings: z.array(AppSettingsItemSchema).optional(),
  userSettings: z.record(z.string(), SettingValueSchema).optional(),
  developerName: z.string().optional(),
  website: z.string().optional(),
  installUrl: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  overview: z.string().optional(),
  createdAt: z.string().optional(),
  approvalStatus: z
    .enum(["draft", "pending", "approved", "rejected"])
    .optional(),
  lastUsedAt: z.string().optional(),
  searchDisplay: SearchDisplayConfigSchema.optional(),
});

export type UnifiedAppBase = z.infer<typeof UnifiedAppBaseSchema>;

export type {
  ApiKeyConfig,
  AuthConfig,
  OAuthConfig,
  ServiceAccountConfig,
} from "../connectors/config";
export type { DocumentTypeCategory } from "../connectors/document-types";

export type UnifiedApp = Omit<UnifiedAppBase, "searchDisplay"> & {
  logo?: LogoComponent | string;
  auth: import("../connectors/config").AuthConfig;
  onInitialize?: () => Promise<void>;
  searchDisplay?: SearchDisplayConfig;
};
