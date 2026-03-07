"use client";

import {
  asUint8Array,
  type BinaryMuxFrame,
  decodeBinaryMuxFrame,
  encodeBinaryMuxFrame,
  isLikelyBinaryMuxFrame,
} from "@openbeam/types/services/daemon";
import type {
  WSInboundMessage,
  WSOutboundMessage,
} from "@openbeam/types/services/daemon/messages";
import {
  WSInboundMessageSchema,
  WSOutboundMessageSchema,
} from "@openbeam/types/services/daemon/messages";

export type DecodedMessage =
  | { kind: "json"; message: WSInboundMessage | WSOutboundMessage }
  | { kind: "binary"; frame: BinaryMuxFrame };

export function encodeOutbound(message: WSOutboundMessage): string {
  return JSON.stringify(message);
}

export function encodeBinaryFrame(frame: BinaryMuxFrame): Uint8Array {
  return encodeBinaryMuxFrame(frame);
}

function parseJsonMessage(
  data: unknown
): (WSInboundMessage | WSOutboundMessage) | null {
  const outbound = WSOutboundMessageSchema.safeParse(data);
  if (outbound.success) {
    return outbound.data;
  }

  const inbound = WSInboundMessageSchema.safeParse(data);
  if (inbound.success) {
    return inbound.data;
  }

  if (process.env.NODE_ENV === "development") {
    const msgType =
      typeof data === "object" && data !== null && "type" in data
        ? (data as Record<string, unknown>).type
        : "unknown";
    console.warn(
      "[daemon-codec] message validation failed",
      { type: msgType },
      outbound.error?.issues.slice(0, 3)
    );
  }

  return null;
}

export function decodeInbound(data: unknown): DecodedMessage | null {
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const bytes = asUint8Array(
      data instanceof ArrayBuffer ? data : (data.buffer as ArrayBuffer)
    );
    if (!isLikelyBinaryMuxFrame(bytes)) {
      return null;
    }
    return { kind: "binary", frame: decodeBinaryMuxFrame(bytes) };
  }

  if (typeof data === "string") {
    const parsed = safeParse(data);
    if (!parsed) {
      return null;
    }
    const message = parseJsonMessage(parsed);
    if (!message) {
      return null;
    }
    return { kind: "json", message };
  }

  if (typeof data === "object" && data !== null) {
    const message = parseJsonMessage(data);
    if (!message) {
      return null;
    }
    return { kind: "json", message };
  }

  return null;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
