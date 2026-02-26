"use client";

import type { BinaryMuxFrame } from "@openplane/types/services/daemon";
import type {
  SessionInboundMessage,
  SessionOutboundMessage,
  WSOutboundMessage,
} from "@openplane/types/services/daemon/messages";
import { DAEMON_DEFAULT_PORT } from "../constants";
import { createBinaryDemuxer, type TerminalOutputHandler } from "./binary-mux";
import {
  type DecodedMessage,
  decodeInbound,
  encodeBinaryFrame,
  encodeOutbound,
} from "./message-codec";

const TRAILING_SLASH = /\/$/;

type ConnectionState = "connecting" | "open" | "closed";

export interface DaemonClientOptions {
  endpoint: string;
  clientSessionKey?: string;
  onSessionMessage?: (message: SessionOutboundMessage) => void;
  onTerminalOutput?: TerminalOutputHandler;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Event) => void;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = Number.POSITIVE_INFINITY;
const PING_INTERVAL_MS = 25_000;

export interface DaemonClient {
  readonly endpoint: string;
  readonly state: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  sendSessionMessage: (message: SessionInboundMessage) => void;
  sendBinaryFrame: (frame: BinaryMuxFrame) => void;
  sendRaw: (message: WSOutboundMessage) => void;
}

export function createDaemonClient(options: DaemonClientOptions): DaemonClient {
  const {
    endpoint,
    clientSessionKey,
    onSessionMessage,
    onTerminalOutput,
    onStateChange,
    onError,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  let ws: WebSocket | null = null;
  let currentState: ConnectionState = "closed";
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let intentionalClose = false;

  const demuxer = createBinaryDemuxer({
    onTerminalOutput,
  });

  function setState(next: ConnectionState) {
    if (currentState === next) {
      return;
    }
    currentState = next;
    onStateChange?.(next);
  }

  function handleMessage(event: MessageEvent) {
    const decoded: DecodedMessage | null = decodeInbound(event.data);
    if (!decoded) {
      return;
    }

    if (decoded.kind === "binary") {
      demuxer(decoded.frame);
      return;
    }

    const wsMsg = decoded.message;
    if (wsMsg.type === "session") {
      onSessionMessage?.(wsMsg.message as SessionOutboundMessage);
    }
  }

  function schedulePing() {
    clearPing();
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(encodeOutbound({ type: "pong" }));
      }
    }, PING_INTERVAL_MS);
  }

  function clearPing() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function scheduleReconnect() {
    if (intentionalClose) {
      return;
    }
    if (reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttempts,
      MAX_RECONNECT_DELAY_MS
    );
    reconnectAttempts += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function connect() {
    cleanup();
    intentionalClose = false;

    const wsUrl = buildWebSocketUrl(endpoint, clientSessionKey);
    setState("connecting");

    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.addEventListener("open", () => {
      reconnectAttempts = 0;
      setState("open");
      schedulePing();
    });

    ws.addEventListener("message", handleMessage);

    ws.addEventListener("close", () => {
      clearPing();
      setState("closed");
      scheduleReconnect();
    });

    ws.addEventListener("error", (event) => {
      onError?.(event);
    });
  }

  function disconnect() {
    intentionalClose = true;
    cleanup();
    setState("closed");
  }

  function cleanup() {
    clearPing();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close(1000);
      }
      ws = null;
    }
  }

  function sendRaw(message: WSOutboundMessage) {
    if (ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(encodeOutbound(message));
  }

  function sendSessionMessage(message: SessionInboundMessage) {
    if (ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify({ type: "session", message }));
  }

  function sendBinaryFrame(frame: BinaryMuxFrame) {
    if (ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(encodeBinaryFrame(frame));
  }

  return {
    get endpoint() {
      return endpoint;
    },
    get state() {
      return currentState;
    },
    connect,
    disconnect,
    sendSessionMessage,
    sendBinaryFrame,
    sendRaw,
  };
}

function buildWebSocketUrl(
  endpoint: string,
  clientSessionKey?: string
): string {
  const url = new URL(endpoint);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (!url.pathname.endsWith("/ws")) {
    url.pathname = `${url.pathname.replace(TRAILING_SLASH, "")}/ws`;
  }
  if (clientSessionKey && clientSessionKey.trim().length > 0) {
    url.searchParams.set("clientSessionKey", clientSessionKey.trim());
  }
  return url.toString();
}

export function buildDefaultEndpoint(
  host = "127.0.0.1",
  port = DAEMON_DEFAULT_PORT
): string {
  return `http://${host}:${port}`;
}
