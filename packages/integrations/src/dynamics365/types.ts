import { z } from "zod";

export const Dynamics365ConfigSchema = z.object({
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  org_url: z.string().optional(),
  tenant_id: z.string().optional(),
  sync_leads: z.boolean().optional(),
  sync_cases: z.boolean().optional(),
  sync_activities: z.boolean().optional(),
  lookback_days: z.string().optional(),
  userEmail: z.string().optional(),
});

export type Dynamics365Config = z.infer<typeof Dynamics365ConfigSchema>;
