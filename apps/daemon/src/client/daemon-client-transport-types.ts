export type DaemonTransport = {
  send: (data: string | Uint8Array | ArrayBuffer) => void;
  close: (code?: number, reason?: string) => void;
  onMessage: (handler: (data: unknown) => void) => () => void;
  onOpen: (handler: () => void) => () => void;
  onClose: (handler: (event?: unknown) => void) => () => void;
  onError: (handler: (event?: unknown) => void) => () => void;
};

export type DaemonTransportFactory = (options: {
  url: string;
  headers?: Record<string, string>;
}) => DaemonTransport;

export type WebSocketFactory = (
  url: string,
  options?: { headers?: Record<string, string> }
) => WebSocketLike;

export type WebSocketLike = {
  readyState: number;
  send: (data: string | Uint8Array | ArrayBuffer) => void;
  close: (code?: number, reason?: string) => void;
  binaryType?: string;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  on?: (event: string, listener: (...args: any[]) => void) => void;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  off?: (event: string, listener: (...args: any[]) => void) => void;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  addEventListener?: (event: string, listener: (event: any) => void) => void;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  removeEventListener?: (event: string, listener: (event: any) => void) => void;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  onopen?: ((event: any) => void) | null;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  onclose?: ((event: any) => void) | null;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  onerror?: ((event: any) => void) | null;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  onmessage?: ((event: any) => void) | null;
};

export interface TransportLogger {
  warn(obj: object, msg?: string): void;
}
