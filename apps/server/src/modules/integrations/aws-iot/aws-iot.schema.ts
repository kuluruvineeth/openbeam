import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_aws_iot_123",
  }),
  accessKeyId: z.string().openapi({
    description: "AWS IAM Access Key ID with IoT read permissions",
  }),
  secretAccessKey: z.string().openapi({
    description: "AWS IAM Secret Access Key",
  }),
  region: z
    .enum([
      "us-east-1",
      "us-east-2",
      "us-west-1",
      "us-west-2",
      "eu-west-1",
      "eu-west-2",
      "eu-central-1",
      "ap-northeast-1",
      "ap-southeast-1",
      "ap-southeast-2",
    ])
    .default("us-east-1")
    .openapi({
      description: "AWS region for IoT resources",
      example: "us-east-1",
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
