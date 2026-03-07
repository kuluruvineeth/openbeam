import { z } from "zod";

export const ControlAssetSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  provider: z.string(),
  objectKey: z.string(),
  contentType: z.string(),
  byteSize: z.number().int(),
  sha256: z.string(),
  originalFilename: z.string().nullable(),
  createdByAgentId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlAsset = z.infer<typeof ControlAssetSchema>;
