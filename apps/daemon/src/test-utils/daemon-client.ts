import WebSocket from "ws";
import {
  type CreateAgentRequestOptions,
  type DaemonEvent,
  type DaemonEventHandler,
  type SendMessageOptions,
  DaemonClient as SharedDaemonClient,
  type DaemonClientConfig as SharedDaemonClientConfig,
  type WebSocketLike,
} from "../client/daemon-client.js";

export type DaemonClientConfig = Omit<
  SharedDaemonClientConfig,
  "webSocketFactory" | "transportFactory"
>;
export type CreateAgentOptions = CreateAgentRequestOptions;
export type { SendMessageOptions, DaemonEvent, DaemonEventHandler };

let testClientCounter = 0;

function nextTestClientSessionKey(): string {
  testClientCounter += 1;
  return `clsk_test_client_${testClientCounter}`;
}

export class DaemonClient extends SharedDaemonClient {
  constructor(config: DaemonClientConfig) {
    const clientSessionKey =
      config.clientSessionKey ?? nextTestClientSessionKey();
    super({
      ...config,
      clientSessionKey,
      webSocketFactory: (url, options) =>
        new WebSocket(url, {
          headers: options?.headers,
        }) as unknown as WebSocketLike,
    });
  }
}
