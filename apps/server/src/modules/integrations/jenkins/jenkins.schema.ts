import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_jenkins_123",
  }),
  instanceUrl: z.string().url().openapi({
    description: "Jenkins instance URL",
    example: "https://jenkins.example.com",
  }),
  username: z.string().openapi({
    description: "Jenkins username",
  }),
  apiToken: z.string().openapi({
    description: "Jenkins API token",
  }),
});

export const ApiKeyAuthResponseSchema = z.object({
  success: z.boolean(),
  connectorId: z.string().optional().openapi({
    description: "Authenticated connector ID",
  }),
  name: z.string().optional().openapi({
    description: "Connector display name",
  }),
  message: z.string().optional().openapi({
    description: "Error message if authentication failed",
  }),
});
