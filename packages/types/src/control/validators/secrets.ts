import { z } from "zod";
import { SECRET_PROVIDERS } from "../secrets";

export const CreateControlSecretInputSchema = z.object({
  name: z.string().min(1).max(255),
  provider: z.enum(SECRET_PROVIDERS).optional(),
  value: z.string().min(1),
  description: z.string().max(1000).nullable().optional(),
  externalRef: z.string().max(1024).nullable().optional(),
});

export type CreateControlSecretInput = z.infer<
  typeof CreateControlSecretInputSchema
>;

export const RotateControlSecretInputSchema = z.object({
  value: z.string().min(1),
  externalRef: z.string().max(1024).nullable().optional(),
});

export type RotateControlSecretInput = z.infer<
  typeof RotateControlSecretInputSchema
>;

export const UpdateControlSecretInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  externalRef: z.string().max(1024).nullable().optional(),
});

export type UpdateControlSecretInput = z.infer<
  typeof UpdateControlSecretInputSchema
>;
