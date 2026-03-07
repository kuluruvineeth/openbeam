import { describe, expect, it } from "bun:test";
import { WebSocket } from "ws";
import {
  decrypt,
  deriveSharedKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from "../crypto";

const RELAY_BASE_URL = "wss://relay.openbeam.sh";

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delayMs: number }
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) {
        await new Promise((r) => setTimeout(r, options.delayMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

describe("Live relay (relay.openbeam.sh) E2E", () => {
  const liveIt = process.env.RUN_LIVE_RELAY_E2E === "1" ? it : it.skip;

  liveIt(
    "bridges encrypted traffic end-to-end",
    async () => {
      await withRetry(
        async () => {
          const serverId = `live-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const clientId = `clt_live_${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const serverControlUrl = `${RELAY_BASE_URL}/ws?serverId=${encodeURIComponent(serverId)}&role=server&v=2`;
          const serverDataUrl = `${RELAY_BASE_URL}/ws?serverId=${encodeURIComponent(
            serverId
          )}&role=server&clientId=${encodeURIComponent(clientId)}&v=2`;
          const clientUrl = `${RELAY_BASE_URL}/ws?serverId=${encodeURIComponent(
            serverId
          )}&role=client&clientId=${encodeURIComponent(clientId)}&v=2`;

          const daemonKeyPair = generateKeyPair();
          const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

          const clientKeyPair = generateKeyPair();
          const clientPubKeyB64 = exportPublicKey(clientKeyPair.publicKey);

          const daemonPubKeyOnClient = importPublicKey(daemonPubKeyB64);
          const clientSharedKey = deriveSharedKey(
            clientKeyPair.secretKey,
            daemonPubKeyOnClient
          );

          const daemonControlWs = new WebSocket(serverControlUrl);
          const clientWs = new WebSocket(clientUrl);
          let daemonWs: WebSocket | null = null;

          const waitOpen = (ws: WebSocket, label: string) =>
            new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error(`Timed out opening ${label} websocket`)),
                10_000
              );
              ws.once("open", () => {
                clearTimeout(timeout);
                resolve();
              });
              ws.once("error", (err) => {
                clearTimeout(timeout);
                reject(err);
              });
            });

          try {
            await Promise.all([
              waitOpen(daemonControlWs, "server-control"),
              waitOpen(clientWs, "client"),
            ]);

            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(
                () =>
                  reject(new Error("Timed out waiting for client_connected")),
                10_000
              );
              daemonControlWs.on("message", (raw) => {
                try {
                  const msg = JSON.parse(raw.toString());
                  if (
                    msg &&
                    msg.type === "client_connected" &&
                    msg.clientId === clientId
                  ) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch {
                  // ignore
                }
              });
            });

            daemonWs = new WebSocket(serverDataUrl);
            await waitOpen(daemonWs, "server-data");

            clientWs.send(
              JSON.stringify({ type: "hello", key: clientPubKeyB64 })
            );

            const daemonReceivedHello = await new Promise<string>(
              (resolve, reject) => {
                const timeout = setTimeout(
                  () => reject(new Error("Timed out waiting for hello")),
                  10_000
                );
                daemonWs?.once("message", (data) => {
                  clearTimeout(timeout);
                  resolve(data.toString());
                });
              }
            );

            const hello = JSON.parse(daemonReceivedHello) as {
              type: string;
              key?: string;
            };
            // biome-ignore lint/suspicious/noMisplacedAssertion: inside retryAsync helper
            expect(hello.type).toBe("hello");
            // biome-ignore lint/suspicious/noMisplacedAssertion: inside retryAsync helper
            expect(typeof hello.key).toBe("string");

            const clientPubKeyOnDaemon = importPublicKey(hello.key as string);
            const daemonSharedKey = deriveSharedKey(
              daemonKeyPair.secretKey,
              clientPubKeyOnDaemon
            );

            const plaintextFromClient = "hello-from-client";
            const ciphertextFromClient = encrypt(
              clientSharedKey,
              plaintextFromClient
            );
            clientWs.send(Buffer.from(ciphertextFromClient));

            const daemonReceivedCiphertext = await new Promise<Buffer>(
              (resolve, reject) => {
                const timeout = setTimeout(
                  () =>
                    reject(
                      new Error("Timed out waiting for encrypted message")
                    ),
                  10_000
                );
                daemonWs?.once("message", (data) => {
                  clearTimeout(timeout);
                  resolve(data as Buffer);
                });
              }
            );

            const decryptedOnDaemon = decrypt(
              daemonSharedKey,
              daemonReceivedCiphertext.buffer.slice(
                daemonReceivedCiphertext.byteOffset,
                daemonReceivedCiphertext.byteOffset +
                  daemonReceivedCiphertext.byteLength
              )
            );
            // biome-ignore lint/suspicious/noMisplacedAssertion: inside retryAsync helper
            expect(decryptedOnDaemon).toBe(plaintextFromClient);

            const plaintextFromDaemon = "hello-from-daemon";
            const ciphertextFromDaemon = encrypt(
              daemonSharedKey,
              plaintextFromDaemon
            );
            daemonWs?.send(Buffer.from(ciphertextFromDaemon));

            const clientReceivedCiphertext = await new Promise<Buffer>(
              (resolve, reject) => {
                const timeout = setTimeout(
                  () =>
                    reject(
                      new Error("Timed out waiting for encrypted response")
                    ),
                  10_000
                );
                clientWs.once("message", (data) => {
                  clearTimeout(timeout);
                  resolve(data as Buffer);
                });
              }
            );

            const decryptedOnClient = decrypt(
              clientSharedKey,
              clientReceivedCiphertext.buffer.slice(
                clientReceivedCiphertext.byteOffset,
                clientReceivedCiphertext.byteOffset +
                  clientReceivedCiphertext.byteLength
              )
            );
            // biome-ignore lint/suspicious/noMisplacedAssertion: inside retryAsync helper
            expect(decryptedOnClient).toBe(plaintextFromDaemon);
          } finally {
            daemonControlWs.close();
            daemonWs?.close();
            clientWs.close();
          }
        },
        { retries: 2, delayMs: 250 }
      );
    },
    45_000
  );
});
