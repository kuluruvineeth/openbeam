import {
  buildExtensionRpcUrl,
  extensionRpcContract,
  parseExtensionChatSubmitResponse,
} from "@openplane/api/extension-rpc";
import type { ExtensionChatSubmitRequest } from "@openplane/types/services/extension/rpc";
import { ExtensionChatSubmitRequestSchema } from "@openplane/types/services/extension/rpc";
import { browser } from "wxt/browser";

const DEFAULT_OPENPLANE_SERVER_URL = "http://localhost:3000";
const STORAGE_KEYS = {
  serverUrl: "openplane.serverUrl",
  apiToken: "openplane.apiToken",
} as const;

export class ExtensionRpcClientError extends Error {
  readonly code:
    | "network_error"
    | "http_error"
    | "response_validation_error"
    | "request_validation_error";

  constructor(
    code:
      | "network_error"
      | "http_error"
      | "response_validation_error"
      | "request_validation_error",
    message: string
  ) {
    super(message);
    this.name = "ExtensionRpcClientError";
    this.code = code;
  }
}

async function getServerConfig(): Promise<{
  serverUrl: string;
  apiToken?: string;
}> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.serverUrl,
    STORAGE_KEYS.apiToken,
  ]);

  const serverUrlRaw = stored[STORAGE_KEYS.serverUrl];
  const apiTokenRaw = stored[STORAGE_KEYS.apiToken];

  const serverUrl =
    typeof serverUrlRaw === "string" && serverUrlRaw.trim().length > 0
      ? serverUrlRaw.trim()
      : DEFAULT_OPENPLANE_SERVER_URL;

  const apiToken =
    typeof apiTokenRaw === "string" && apiTokenRaw.trim().length > 0
      ? apiTokenRaw.trim()
      : undefined;

  return {
    serverUrl,
    apiToken,
  };
}

export async function submitExtensionChatRpc(input: unknown) {
  const parsedRequest = ExtensionChatSubmitRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    throw new ExtensionRpcClientError(
      "request_validation_error",
      "Invalid extension chat request payload"
    );
  }

  const request: ExtensionChatSubmitRequest = parsedRequest.data;
  const config = await getServerConfig();
  const endpoint = buildExtensionRpcUrl(
    config.serverUrl,
    extensionRpcContract.chatSubmit.path
  );

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 12_000);

  try {
    const response = await fetch(endpoint, {
      method: extensionRpcContract.chatSubmit.method,
      headers: {
        "Content-Type": "application/json",
        ...(config.apiToken
          ? { Authorization: `Bearer ${config.apiToken}` }
          : {}),
      },
      body: JSON.stringify(request),
      signal: abortController.signal,
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      const parsedError =
        extensionRpcContract.chatSubmit.errorSchema.safeParse(responseBody);
      if (parsedError.success) {
        throw new ExtensionRpcClientError("http_error", parsedError.data.error);
      }

      throw new ExtensionRpcClientError(
        "http_error",
        `OpenPlane server request failed (${response.status})`
      );
    }

    return parseExtensionChatSubmitResponse(responseBody);
  } catch (error) {
    if (error instanceof ExtensionRpcClientError) {
      throw error;
    }

    throw new ExtensionRpcClientError(
      "network_error",
      "Unable to reach OpenPlane server"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getExtensionRpcConnectionState() {
  const config = await getServerConfig();

  return {
    serverUrl: config.serverUrl,
    hasApiToken: Boolean(config.apiToken),
  };
}
