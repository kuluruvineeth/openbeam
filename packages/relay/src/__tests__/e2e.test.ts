import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Buffer } from "node:buffer";
import { type ChildProcess, spawn } from "node:child_process";
import net from "node:net";
import { WebSocket } from "ws";
import {
  decrypt,
  deriveSharedKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from "../crypto";

const shouldRunRelayE2e = process.env.FORCE_RELAY_E2E === "1";

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to acquire port")));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(port: number, timeout = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect(port, "127.0.0.1", () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`Server did not start on port ${port} within ${timeout}ms`);
}

async function waitForRelayWebSocketReady(
  port: number,
  timeout = 60_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const serverId = `probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const probeUrl = `ws://127.0.0.1:${port}/ws?serverId=${serverId}&role=server&v=2`;
    const opened = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(probeUrl);
      const timer = setTimeout(() => {
        ws.terminate();
        resolve(false);
      }, 5000);
      ws.once("open", () => {
        clearTimeout(timer);
        ws.close(1000, "probe");
        resolve(true);
      });
      ws.once("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
    if (opened) {
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Relay WebSocket endpoint not ready on port ${port} within ${timeout}ms`
  );
}

const describeE2e = shouldRunRelayE2e ? describe : describe.skip;

describeE2e("E2E Relay with E2EE", () => {
  let relayPort: number;
  let relayProcess: ChildProcess | null = null;

  beforeAll(async () => {
    relayPort = await getAvailablePort();
    relayProcess = spawn(
      "npx",
      [
        "wrangler",
        "dev",
        "--local",
        "--ip",
        "127.0.0.1",
        "--port",
        String(relayPort),
        "--live-reload=false",
        "--show-interactive-dev-session=false",
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      }
    );

    relayProcess.stdout?.on("data", (data: Buffer) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((l) => l.trim());
      for (const line of lines) {
        console.log(`[relay] ${line}`);
      }
    });
    relayProcess.stderr?.on("data", (data: Buffer) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((l) => l.trim());
      for (const line of lines) {
        console.error(`[relay] ${line}`);
      }
    });

    await waitForServer(relayPort, 30_000);
    await waitForRelayWebSocketReady(relayPort, 60_000);
  });

  afterAll(() => {
    if (relayProcess) {
      relayProcess.kill("SIGTERM");
      relayProcess = null;
    }
  });

  it("full flow: daemon and client exchange encrypted messages through relay", async () => {
    const serverId = `test-session-${Date.now()}`;
    const clientId = `clt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const daemonKeyPair = generateKeyPair();
    const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

    const daemonControlWs = new WebSocket(
      `ws://127.0.0.1:${relayPort}/ws?serverId=${serverId}&role=server&v=2`
    );

    await new Promise<void>((resolve, reject) => {
      daemonControlWs.on("open", resolve);
      daemonControlWs.on("error", reject);
    });

    const clientKeyPair = generateKeyPair();
    const clientPubKeyB64 = exportPublicKey(clientKeyPair.publicKey);

    const daemonPubKeyOnClient = importPublicKey(daemonPubKeyB64);
    const clientSharedKey = deriveSharedKey(
      clientKeyPair.secretKey,
      daemonPubKeyOnClient
    );

    const waitForClientSeen = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("timed out waiting for client_connected")),
        5000
      );
      const onMessage = (raw: unknown) => {
        try {
          let text = "";
          if (typeof raw === "string") {
            text = raw;
          } else if (raw && typeof (raw as any).toString === "function") {
            text = (raw as any).toString();
          }
          const msg = JSON.parse(text);
          if (msg?.type === "client_connected" && msg.clientId === clientId) {
            clearTimeout(timeout);
            daemonControlWs.off("message", onMessage);
            resolve();
            return;
          }
          if (
            msg?.type === "sync" &&
            Array.isArray(msg.clientIds) &&
            msg.clientIds.includes(clientId)
          ) {
            clearTimeout(timeout);
            daemonControlWs.off("message", onMessage);
            resolve();
          }
        } catch {
          // ignore
        }
      };
      daemonControlWs.on("message", onMessage);
    });

    const clientWs = new WebSocket(
      `ws://127.0.0.1:${relayPort}/ws?serverId=${serverId}&role=client&clientId=${clientId}&v=2`
    );

    await new Promise<void>((resolve, reject) => {
      clientWs.on("open", resolve);
      clientWs.on("error", reject);
    });

    await waitForClientSeen;

    const daemonWs = new WebSocket(
      `ws://127.0.0.1:${relayPort}/ws?serverId=${serverId}&role=server&clientId=${clientId}&v=2`
    );
    await new Promise<void>((resolve, reject) => {
      daemonWs.on("open", resolve);
      daemonWs.on("error", reject);
    });

    const helloMsg = JSON.stringify({ type: "hello", key: clientPubKeyB64 });
    clientWs.send(helloMsg);

    const daemonReceivedHello = await new Promise<string>((resolve) => {
      daemonWs.once("message", (data) => resolve(data.toString()));
    });

    const hello = JSON.parse(daemonReceivedHello);
    expect(hello.type).toBe("hello");
    expect(hello.key).toBe(clientPubKeyB64);

    const clientPubKeyOnDaemon = importPublicKey(hello.key);
    const daemonSharedKey = deriveSharedKey(
      daemonKeyPair.secretKey,
      clientPubKeyOnDaemon
    );

    const readyPlaintext = JSON.stringify({ type: "ready" });
    const readyCiphertext = encrypt(daemonSharedKey, readyPlaintext);
    daemonWs.send(Buffer.from(readyCiphertext));

    const clientReceivedReady = await new Promise<Buffer>((resolve) => {
      clientWs.once("message", (data) => resolve(data as Buffer));
    });
    const decryptedReady = decrypt(
      clientSharedKey,
      clientReceivedReady.buffer.slice(
        clientReceivedReady.byteOffset,
        clientReceivedReady.byteOffset + clientReceivedReady.byteLength
      )
    );
    expect(JSON.parse(decryptedReady as string)).toEqual({ type: "ready" });

    const clientMessage = "Hello from client!";
    const clientCiphertext = encrypt(clientSharedKey, clientMessage);
    clientWs.send(Buffer.from(clientCiphertext));

    const daemonReceivedMsg = await new Promise<Buffer>((resolve) => {
      daemonWs.once("message", (data) => resolve(data as Buffer));
    });
    const decryptedClientMsg = decrypt(
      daemonSharedKey,
      daemonReceivedMsg.buffer.slice(
        daemonReceivedMsg.byteOffset,
        daemonReceivedMsg.byteOffset + daemonReceivedMsg.byteLength
      )
    );
    expect(decryptedClientMsg).toBe(clientMessage);

    const daemonMessage = "Hello from daemon!";
    const daemonCiphertext = encrypt(daemonSharedKey, daemonMessage);
    daemonWs.send(Buffer.from(daemonCiphertext));

    const clientReceivedMsg = await new Promise<Buffer>((resolve) => {
      clientWs.once("message", (data) => resolve(data as Buffer));
    });
    const decryptedDaemonMsg = decrypt(
      clientSharedKey,
      clientReceivedMsg.buffer.slice(
        clientReceivedMsg.byteOffset,
        clientReceivedMsg.byteOffset + clientReceivedMsg.byteLength
      )
    );
    expect(decryptedDaemonMsg).toBe(daemonMessage);

    daemonWs.close();
    clientWs.close();
  }, 90_000);

  it("relay only sees opaque bytes after handshake", async () => {
    const serverId = `opaque-test-${Date.now()}`;
    const clientId = `clt_opaque_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const daemonKeyPair = generateKeyPair();
    const clientKeyPair = generateKeyPair();

    const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);
    const clientPubKeyB64 = exportPublicKey(clientKeyPair.publicKey);

    const clientPubKey = importPublicKey(clientPubKeyB64);
    const daemonPubKey = importPublicKey(daemonPubKeyB64);

    const daemonSharedKey = deriveSharedKey(
      daemonKeyPair.secretKey,
      clientPubKey
    );
    const clientSharedKey = deriveSharedKey(
      clientKeyPair.secretKey,
      daemonPubKey
    );

    const daemonControlWs = new WebSocket(
      `ws://127.0.0.1:${relayPort}/ws?serverId=${serverId}&role=server&v=2`
    );
    await new Promise<void>((r) => daemonControlWs.on("open", r));

    const waitForClientSeen = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("timed out waiting for client_connected")),
        5000
      );
      const onMessage = (raw: unknown) => {
        try {
          let text = "";
          if (typeof raw === "string") {
            text = raw;
          } else if (raw && typeof (raw as any).toString === "function") {
            text = (raw as any).toString();
          }
          const msg = JSON.parse(text);
          if (msg?.type === "client_connected" && msg.clientId === clientId) {
            clearTimeout(timeout);
            daemonControlWs.off("message", onMessage);
            resolve();
            return;
          }
          if (
            msg?.type === "sync" &&
            Array.isArray(msg.clientIds) &&
            msg.clientIds.includes(clientId)
          ) {
            clearTimeout(timeout);
            daemonControlWs.off("message", onMessage);
            resolve();
          }
        } catch {
          // ignore
        }
      };
      daemonControlWs.on("message", onMessage);
    });

    const clientWs = new WebSocket(
      `ws://127.0.0.1:${relayPort}/ws?serverId=${serverId}&role=client&clientId=${clientId}&v=2`
    );
    await new Promise<void>((r) => clientWs.on("open", r));
    await waitForClientSeen;

    const daemonWs = new WebSocket(
      `ws://127.0.0.1:${relayPort}/ws?serverId=${serverId}&role=server&clientId=${clientId}&v=2`
    );
    await new Promise<void>((r) => daemonWs.on("open", r));

    clientWs.send(JSON.stringify({ type: "hello", key: clientPubKeyB64 }));
    await new Promise<void>((resolve) => {
      daemonWs.once("message", () => resolve());
    });

    const secret = "This is a secret that relay cannot read";
    const ciphertext = encrypt(clientSharedKey, secret);
    clientWs.send(Buffer.from(ciphertext));

    const received = await new Promise<Buffer>((resolve) => {
      daemonWs.once("message", (data) => resolve(data as Buffer));
    });

    const rawString = received.toString("utf-8");
    expect(rawString).not.toContain(secret);

    const decrypted = decrypt(
      daemonSharedKey,
      received.buffer.slice(
        received.byteOffset,
        received.byteOffset + received.byteLength
      )
    );
    expect(decrypted).toBe(secret);

    daemonControlWs.close();
    daemonWs.close();
    clientWs.close();
  }, 90_000);

  it("wrong key cannot decrypt", () => {
    const daemonKeyPair = generateKeyPair();
    const clientKeyPair = generateKeyPair();
    const attackerKeyPair = generateKeyPair();

    const clientPubKey = importPublicKey(
      exportPublicKey(clientKeyPair.publicKey)
    );
    const daemonSharedKey = deriveSharedKey(
      daemonKeyPair.secretKey,
      clientPubKey
    );

    const attackerPubKey = importPublicKey(
      exportPublicKey(attackerKeyPair.publicKey)
    );
    const attackerKey = deriveSharedKey(
      attackerKeyPair.secretKey,
      attackerPubKey
    );

    const secret = "Top secret message";
    const ciphertext = encrypt(daemonSharedKey, secret);

    expect(() => decrypt(attackerKey, ciphertext)).toThrow();
  });
});
