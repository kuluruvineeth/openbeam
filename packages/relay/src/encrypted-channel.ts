/// <reference lib="dom" />

import { arrayBufferToBase64, base64ToArrayBuffer } from "./base64";
import {
  decrypt,
  deriveSharedKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
  type KeyPair,
  type SharedKey,
} from "./crypto";

export interface Transport {
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  onmessage: ((data: string | ArrayBuffer) => void) | null;
  onclose: ((code: number, reason: string) => void) | null;
  onerror: ((error: Error) => void) | null;
}

export interface EncryptedChannelEvents {
  onopen?: () => void;
  onmessage?: (data: string | ArrayBuffer) => void;
  onclose?: (code: number, reason: string) => void;
  onerror?: (error: Error) => void;
}

type ChannelState = "connecting" | "handshaking" | "open" | "closed";

type EncryptedChannelOptions = {
  daemonKeyPair?: KeyPair;
};

interface HelloMessage {
  type: "hello";
  key: string;
}

interface ReadyMessage {
  type: "ready";
}

const HANDSHAKE_RETRY_MS = 1000;
const MAX_PENDING_SENDS = 200;

export function createClientChannel(
  transport: Transport,
  daemonPublicKeyB64: string,
  events: EncryptedChannelEvents = {}
): EncryptedChannel {
  const keyPair = generateKeyPair();
  const daemonPublicKey = importPublicKey(daemonPublicKeyB64);
  const sharedKey = deriveSharedKey(keyPair.secretKey, daemonPublicKey);

  const channel = new EncryptedChannel(transport, sharedKey, events);

  const ourPublicKeyB64 = exportPublicKey(keyPair.publicKey);
  const hello: HelloMessage = { type: "hello", key: ourPublicKeyB64 };
  const helloText = JSON.stringify(hello);

  let retry: ReturnType<typeof setInterval> | null = null;
  const emitSendError = (error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    events.onerror?.(err);
  };
  const sendHello = () => {
    try {
      transport.send(helloText);
      return true;
    } catch (error) {
      emitSendError(error);
      return false;
    }
  };
  const clearRetry = () => {
    if (retry) {
      clearInterval(retry);
      retry = null;
    }
  };

  channel.onTransitionToOpen(() => clearRetry());
  channel.onClose(() => clearRetry());

  sendHello();
  retry = setInterval(() => {
    if (channel.isOpen()) {
      clearRetry();
      return;
    }
    sendHello();
  }, HANDSHAKE_RETRY_MS);
  (retry as unknown as { unref?: () => void }).unref?.();

  return channel;
}

export function createDaemonChannel(
  transport: Transport,
  daemonKeyPair: KeyPair,
  events: EncryptedChannelEvents = {}
): Promise<EncryptedChannel> {
  return new Promise((resolve, reject) => {
    const bufferedMessages: Array<string | ArrayBuffer> = [];
    const shouldIgnorePostHelloPlaintext = (
      data: string | ArrayBuffer
    ): boolean => {
      try {
        const text =
          typeof data === "string" ? data : new TextDecoder().decode(data);
        const parsed = JSON.parse(text) as Partial<HelloMessage | ReadyMessage>;
        return parsed.type === "hello" || parsed.type === "ready";
      } catch {
        return false;
      }
    };

    transport.onmessage = (data) => {
      try {
        const helloText =
          typeof data === "string" ? data : new TextDecoder().decode(data);

        const msg = JSON.parse(helloText) as HelloMessage;
        if (msg.type !== "hello" || !msg.key) {
          throw new Error("Invalid hello message");
        }

        transport.onmessage = (next) => {
          bufferedMessages.push(next);
        };

        const clientPublicKey = importPublicKey(msg.key);
        const sharedKey = deriveSharedKey(
          daemonKeyPair.secretKey,
          clientPublicKey
        );

        const channel = new EncryptedChannel(transport, sharedKey, events, {
          daemonKeyPair,
        });
        transport.send(
          JSON.stringify({ type: "ready" } satisfies ReadyMessage)
        );

        channel.setState("open");
        events.onopen?.();

        for (const buffered of bufferedMessages) {
          if (shouldIgnorePostHelloPlaintext(buffered)) {
            continue;
          }
          transport.onmessage?.(buffered);
        }

        resolve(channel);
      } catch (error) {
        reject(error);
      }
    };

    transport.onerror = (error) => {
      reject(error);
    };

    transport.onclose = (code, reason) => {
      reject(
        new Error(`Connection closed during handshake: ${code} ${reason}`)
      );
    };
  });
}

export class EncryptedChannel {
  private readonly transport: Transport;
  private sharedKey: SharedKey;
  private state: ChannelState = "handshaking";
  private readonly events: EncryptedChannelEvents;
  private readonly options: EncryptedChannelOptions;
  private pendingSends: Array<string | ArrayBuffer> = [];
  private readonly onOpenCallbacks: Array<() => void> = [];
  private readonly onCloseCallbacks: Array<() => void> = [];

  constructor(
    transport: Transport,
    sharedKey: SharedKey,
    events: EncryptedChannelEvents = {},
    options: EncryptedChannelOptions = {}
  ) {
    this.transport = transport;
    this.sharedKey = sharedKey;
    this.events = events;
    this.options = options;

    transport.onmessage = (data) => this.handleMessage(data);
    transport.onclose = (code, reason) => {
      this.state = "closed";
      this.events.onclose?.(code, reason);
      for (const cb of this.onCloseCallbacks) {
        cb();
      }
    };
    transport.onerror = (error) => {
      this.events.onerror?.(error);
    };
  }

  setState(state: ChannelState): void {
    this.state = state;
  }

  private async handleMessage(data: string | ArrayBuffer): Promise<void> {
    if (this.state === "handshaking") {
      try {
        const text =
          typeof data === "string" ? data : new TextDecoder().decode(data);
        const msg = JSON.parse(text) as Partial<ReadyMessage>;
        if (msg.type === "ready") {
          this.state = "open";
          this.events.onopen?.();
          for (const cb of this.onOpenCallbacks) {
            cb();
          }
          await this.flushPendingSends();
        }
      } catch {
        // ignore non-ready handshake traffic
      }
      return;
    }

    if (this.state !== "open") {
      return;
    }

    try {
      const ciphertext = await (async () => {
        try {
          const text =
            typeof data === "string" ? data : new TextDecoder().decode(data);
          if (text.trim().startsWith("{")) {
            const parsed = JSON.parse(text) as Partial<
              HelloMessage | ReadyMessage
            >;

            if (parsed.type === "hello" && typeof parsed.key === "string") {
              if (this.options.daemonKeyPair) {
                try {
                  const clientPublicKey = importPublicKey(parsed.key);
                  const nextSharedKey = deriveSharedKey(
                    this.options.daemonKeyPair.secretKey,
                    clientPublicKey
                  );

                  if (keysEqual(nextSharedKey, this.sharedKey)) {
                    this.transport.send(
                      JSON.stringify({ type: "ready" } satisfies ReadyMessage)
                    );
                    return null;
                  }

                  this.state = "handshaking";
                  this.sharedKey = nextSharedKey;
                  this.pendingSends = [];
                  this.transport.send(
                    JSON.stringify({ type: "ready" } satisfies ReadyMessage)
                  );
                  this.state = "open";
                  await this.flushPendingSends();
                  return null;
                } catch {
                  // Re-key derivation failed — fall through to treat as ciphertext
                }
              }
              return null;
            }

            if (parsed.type === "ready") {
              return null;
            }

            throw new Error("Received plaintext frame on encrypted channel");
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("plaintext frame")
          ) {
            throw error;
          }
        }

        if (typeof data === "string") {
          return base64ToArrayBuffer(data);
        }

        try {
          const decoded = new TextDecoder().decode(data);
          return base64ToArrayBuffer(decoded);
        } catch {
          return data;
        }
      })();

      if (ciphertext) {
        const plaintext = await decrypt(this.sharedKey, ciphertext);
        this.events.onmessage?.(plaintext);
      }
    } catch {
      try {
        this.transport.close(1011, "Decryption failure");
      } catch {
        // ignore
      }
    }
  }

  async send(data: string | ArrayBuffer): Promise<void> {
    if (this.state === "handshaking") {
      if (this.pendingSends.length >= MAX_PENDING_SENDS) {
        this.pendingSends.shift();
      }
      this.pendingSends.push(data);
      return;
    }

    if (this.state !== "open") {
      throw new Error("Channel not open");
    }

    const ciphertext = await encrypt(this.sharedKey, data);
    this.transport.send(arrayBufferToBase64(ciphertext));
  }

  private async flushPendingSends(): Promise<void> {
    if (this.state !== "open") {
      return;
    }
    const pending = this.pendingSends;
    this.pendingSends = [];
    for (const item of pending) {
      await this.send(item);
    }
  }

  close(code = 1000, reason = "Normal closure"): void {
    this.state = "closed";
    this.transport.close(code, reason);
  }

  isOpen(): boolean {
    return this.state === "open";
  }

  onTransitionToOpen(cb: () => void): void {
    this.onOpenCallbacks.push(cb);
  }

  onClose(cb: () => void): void {
    this.onCloseCallbacks.push(cb);
  }
}

function keysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    // biome-ignore lint/suspicious/noBitwiseOperators: timing-safe constant-time key comparison
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
