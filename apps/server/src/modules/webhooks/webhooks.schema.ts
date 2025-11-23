import { z } from "zod";

// Slack webhook schemas
export const slackEventSchema = z.object({
  type: z.string(),
  challenge: z.string().optional(),
  team_id: z.string().optional(),
  event_id: z.string().optional(),
  event: z.any().optional(),
});

export const slackSignatureHeadersSchema = z.object({
  "x-slack-signature": z.string(),
  "x-slack-request-timestamp": z.string(),
});
