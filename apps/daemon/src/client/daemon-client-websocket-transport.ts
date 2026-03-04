import type {
  DaemonTransportFactory,
  WebSocketFactory,
  WebSocketLike,
} from "./daemon-client-transport-types";

export function defaultWebSocketFactory(
  url: string,
  _options?: { headers?: Record<string, string> }
): WebSocketLike {
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  const globalWs = (globalThis as { WebSocket?: any }).WebSocket;
  if (!globalWs) {
    throw new Error("WebSocket is not available in this runtime");
  }
  return new globalWs(url);
}

export function createWebSocketTransportFactory(
  factory: WebSocketFactory
): DaemonTransportFactory {
  return ({ url, headers }) => {
    const ws = factory(url, { headers });
    if ("binaryType" in ws) {
      try {
        ws.binaryType = "arraybuffer";
      } catch {
        // no-op
      }
    }
    return {
      send: (data) => {
        if (typeof ws.readyState === "number" && ws.readyState !== 1) {
          throw new Error(`WebSocket not open (readyState=${ws.readyState})`);
        }
        ws.send(data);
      },
      close: (code?: number, reason?: string) => ws.close(code, reason),
      onOpen: (handler) => bindWsHandler(ws, "open", handler),
      onClose: (handler) => bindWsHandler(ws, "close", handler),
      onError: (handler) => bindWsHandler(ws, "error", handler),
      onMessage: (handler) => bindWsHandler(ws, "message", handler),
    };
  };
}

export function bindWsHandler(
  ws: WebSocketLike,
  event: "open" | "close" | "error" | "message",
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  handler: (...args: any[]) => void
): () => void {
  if (typeof ws.addEventListener === "function") {
    ws.addEventListener(event, handler);
    return () => {
      if (typeof ws.removeEventListener === "function") {
        ws.removeEventListener(event, handler);
      }
    };
  }
  if (typeof ws.on === "function") {
    ws.on(event, handler);
    return () => {
      if (typeof ws.off === "function") {
        ws.off(event, handler);
        return;
      }
      if (typeof ws.removeListener === "function") {
        ws.removeListener(event, handler);
      }
    };
  }
  const prop = `on${event}` as "onopen" | "onclose" | "onerror" | "onmessage";
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  const previous = (ws as any)[prop];
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  (ws as any)[prop] = handler;
  return () => {
    // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
    if ((ws as any)[prop] === handler) {
      // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
      (ws as any)[prop] = previous ?? null;
    }
  };
}
