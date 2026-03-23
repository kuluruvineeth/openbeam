import { z } from "@hono/zod-openapi";

export const WorkdayCallbackBodySchema = z.object({
  code: z.string().openapi({
    description: "OAuth authorization code from Workday",
  }),
  state: z.string().openapi({
    description: "OAuth state parameter for CSRF verification",
  }),
});

export const WorkdayCallbackResponseSchema = z.object({
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

export const WorkdayStartAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_workday_123",
  }),
  tenant: z.string().openapi({
    description: "Workday tenant name",
    example: "your_tenant",
  }),
  host: z.string().openapi({
    description: "Workday host (e.g., wd5-services1.myworkday.com)",
    example: "wd5-services1.myworkday.com",
  }),
});

export const WorkdayStartAuthResponseSchema = z.object({
  success: z.boolean(),
  authUrl: z.string().optional().openapi({
    description: "OAuth authorization URL to redirect user to",
  }),
  message: z.string().optional().openapi({
    description: "Error message if start failed",
  }),
});
