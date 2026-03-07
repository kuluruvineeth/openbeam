import { z } from "zod";

export const SECRET_PROVIDERS = [
  "LOCAL_ENCRYPTED",
  "AWS_SECRETS_MANAGER",
  "GCP_SECRET_MANAGER",
  "VAULT",
] as const;

export const SecretProviderSchema = z.enum(SECRET_PROVIDERS);
export type SecretProvider = z.infer<typeof SecretProviderSchema>;

export const ControlTeamSecretSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  provider: SecretProviderSchema,
  externalRef: z.string().nullable(),
  latestVersion: z.number().int(),
  description: z.string().nullable(),
  createdByAgentId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlTeamSecret = z.infer<typeof ControlTeamSecretSchema>;

export const ControlTeamSecretVersionSchema = z.object({
  id: z.string(),
  secretId: z.string(),
  version: z.number().int(),
  material: z.record(z.string(), z.unknown()),
  valueSha256: z.string(),
  createdByAgentId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type ControlTeamSecretVersion = z.infer<
  typeof ControlTeamSecretVersionSchema
>;
