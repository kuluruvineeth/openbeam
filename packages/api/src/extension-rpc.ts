import {
  type ExtensionChatSubmitRequest,
  ExtensionChatSubmitRequestSchema,
  type ExtensionChatSubmitResponse,
  ExtensionChatSubmitResponseSchema,
  type ExtensionRpcErrorResponse,
  ExtensionRpcErrorResponseSchema,
} from "@openplane/types/services/extension/rpc";

export const EXTENSION_CHAT_SUBMIT_PATH = "/api/v1/extensions/chat/submit";

export const extensionRpcContract = {
  chatSubmit: {
    method: "POST",
    path: EXTENSION_CHAT_SUBMIT_PATH,
    requestSchema: ExtensionChatSubmitRequestSchema,
    responseSchema: ExtensionChatSubmitResponseSchema,
    errorSchema: ExtensionRpcErrorResponseSchema,
  },
} as const;

export function buildExtensionRpcUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}${path}`;
}

export function parseExtensionChatSubmitRequest(
  input: unknown
): ExtensionChatSubmitRequest {
  return ExtensionChatSubmitRequestSchema.parse(input);
}

export function parseExtensionChatSubmitResponse(
  input: unknown
): ExtensionChatSubmitResponse {
  return ExtensionChatSubmitResponseSchema.parse(input);
}

export function parseExtensionRpcError(
  input: unknown
): ExtensionRpcErrorResponse {
  return ExtensionRpcErrorResponseSchema.parse(input);
}
