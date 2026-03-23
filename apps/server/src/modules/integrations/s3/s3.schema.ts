import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_s3_123",
  }),
  accessKeyId: z.string().openapi({
    description: "AWS IAM Access Key ID with S3 read permissions",
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
      "eu-west-3",
      "eu-central-1",
      "eu-north-1",
      "ap-northeast-1",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-south-1",
      "sa-east-1",
      "ca-central-1",
      "me-south-1",
      "af-south-1",
    ])
    .default("us-east-1")
    .openapi({
      description: "AWS region where the S3 bucket is located",
      example: "us-east-1",
    }),
  bucketName: z.string().openapi({
    description: "Name of the S3 bucket to sync",
    example: "my-bucket",
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
