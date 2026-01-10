import { z } from "zod";

export const OverviewRequestSchema = z.object({
  query: z.string().min(1),
  teamId: z.string(),
  userId: z.string().optional(),
  accessControlIds: z.array(z.string()).optional(),
  maxSources: z.number().min(1).max(20).default(8),
  enableFanout: z.boolean().default(true),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type OverviewRequest = z.infer<typeof OverviewRequestSchema>;
