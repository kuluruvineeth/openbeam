import { z } from "@hono/zod-openapi";
import {
  ExtensionChatSubmitRequestSchema,
  ExtensionChatSubmitResponseSchema,
  ExtensionRpcErrorResponseSchema,
} from "@openbeam/types/services/extension/rpc";

export const extensionChatSubmitBodySchema = ExtensionChatSubmitRequestSchema;
export const extensionChatSubmitResponseSchema =
  ExtensionChatSubmitResponseSchema;

export const extensionErrorSchema = ExtensionRpcErrorResponseSchema;

export const extensionNotAuthorizedSchema = z.object({
  error: z.string(),
  message: z.string(),
});
