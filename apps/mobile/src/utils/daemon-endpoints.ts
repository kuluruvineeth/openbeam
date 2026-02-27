import {
  buildDaemonWebSocketUrl,
  buildRelayWebSocketUrl as buildSharedRelayWebSocketUrl,
  deriveLabelFromEndpoint,
  extractHostPortFromWebSocketUrl,
  type HostPortParts,
  normalizeHostPort,
  parseHostPort,
} from "@server/shared/daemon-endpoints";
import { Buffer } from "buffer";

export type { HostPortParts };

export {
  buildDaemonWebSocketUrl,
  deriveLabelFromEndpoint,
  extractHostPortFromWebSocketUrl,
  normalizeHostPort,
  parseHostPort,
};

function decodeBase64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeOfferFragmentPayload(encoded: string): unknown {
  const json = decodeBase64UrlToUtf8(encoded);
  return JSON.parse(json) as unknown;
}

export function buildRelayWebSocketUrl(params: {
  endpoint: string;
  serverId: string;
  clientSessionKey?: string;
}): string {
  return buildSharedRelayWebSocketUrl({ ...params, role: "client" });
}
