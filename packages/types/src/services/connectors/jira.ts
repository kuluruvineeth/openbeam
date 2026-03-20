import { z } from "zod";

export const JiraSyncCursorSchema = z.object({
  lastSyncTime: z.string().optional(),
  nextPageToken: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type JiraSyncCursor = z.infer<typeof JiraSyncCursorSchema>;

export const JiraSyncOptionsSchema = z.object({
  cursor: JiraSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(50),
  lookbackDays: z.number().optional(),
});

export type JiraSyncOptions = z.infer<typeof JiraSyncOptionsSchema>;

export const JiraTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  siteUrl: z.string(),
  cloudId: z.string(),
});

export type JiraTransformContext = z.infer<typeof JiraTransformContextSchema>;

export interface JiraSyncBatch<T> {
  items: T[];
  cursor: JiraSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const JiraWebhookEventSchema = z.enum([
  "jira:issue_deleted",
  "jira:issue_created",
  "jira:issue_updated",
]);

export type JiraWebhookEventType = z.infer<typeof JiraWebhookEventSchema>;

export const JiraWebhookPayloadSchema = z.object({
  webhookEvent: z.string(),
  issue_event_type_name: z.string().optional(),
  timestamp: z.number(),
  issue: z.object({
    id: z.string(),
    key: z.string(),
    self: z.string().optional(),
  }),
});

export type JiraWebhookPayload = z.infer<typeof JiraWebhookPayloadSchema>;

export const JiraWebhookRegistrationSchema = z.object({
  id: z.number(),
  url: z.string(),
  events: z.array(z.string()),
  expirationDate: z.number().optional(),
});

export type JiraWebhookRegistration = z.infer<
  typeof JiraWebhookRegistrationSchema
>;
