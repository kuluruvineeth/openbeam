import { describe, expect, it, mock } from "bun:test";
import { exportPublicKey, generateKeyPair } from "../crypto";
import {
  createClientChannel,
  createDaemonChannel,
  type Transport,
} from "../encrypted-channel";

function createMockTransportPair(): [Transport, Transport] {
  const transportA: Transport = {
    send: mock(),
    close: mock(),
    onmessage: null,
    onclose: null,
    onerror: null,
  };

  const transportB: Transport = {
    send: mock(),
    close: mock(),
    onmessage: null,
    onclose: null,
    onerror: null,
  };

  (transportA.send as ReturnType<typeof mock>).mockImplementation(
    (data: string | ArrayBuffer) => {
      setTimeout(() => transportB.onmessage?.(data), 0);
    }
  );

  (transportB.send as ReturnType<typeof mock>).mockImplementation(
    (data: string | ArrayBuffer) => {
      setTimeout(() => transportA.onmessage?.(data), 0);
    }
  );

  return [transportA, transportB];
}

describe("EncryptedChannel", () => {
  it("establishes encrypted channel between daemon and client", async () => {
    const [daemonTransport, clientTransport] = createMockTransportPair();

    const daemonKeyPair = generateKeyPair();
    const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

    let clientOpenedResolve: (() => void) | null = null;
    const clientOpened = new Promise<void>((resolve) => {
      clientOpenedResolve = resolve;
    });

    const daemonChannelPromise = createDaemonChannel(
      daemonTransport,
      daemonKeyPair
    );

    const clientChannel = await createClientChannel(
      clientTransport,
      daemonPubKeyB64,
      { onopen: () => clientOpenedResolve?.() }
    );

    const daemonChannel = await daemonChannelPromise;
    await clientOpened;

    expect(clientChannel.isOpen()).toBe(true);
    expect(daemonChannel.isOpen()).toBe(true);
  });

  it("exchanges encrypted messages bidirectionally", async () => {
    const [daemonTransport, clientTransport] = createMockTransportPair();

    const daemonKeyPair = generateKeyPair();
    const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

    const daemonMessages: (string | ArrayBuffer)[] = [];
    const clientMessages: (string | ArrayBuffer)[] = [];

    let clientOpenedResolve: (() => void) | null = null;
    const clientOpened = new Promise<void>((resolve) => {
      clientOpenedResolve = resolve;
    });

    const daemonChannelPromise = createDaemonChannel(
      daemonTransport,
      daemonKeyPair,
      { onmessage: (data) => daemonMessages.push(data) }
    );

    const clientChannel = await createClientChannel(
      clientTransport,
      daemonPubKeyB64,
      {
        onmessage: (data) => clientMessages.push(data),
        onopen: () => clientOpenedResolve?.(),
      }
    );

    const daemonChannel = await daemonChannelPromise;
    await clientOpened;

    await clientChannel.send("Hello from client");
    await daemonChannel.send("Hello from daemon");
    await clientChannel.send("Second message from client");

    await new Promise((r) => setTimeout(r, 50));

    expect(daemonMessages).toEqual([
      "Hello from client",
      "Second message from client",
    ]);
    expect(clientMessages).toEqual(["Hello from daemon"]);
  });

  it("encrypted messages are opaque to transport", async () => {
    const [daemonTransport, clientTransport] = createMockTransportPair();

    const daemonKeyPair = generateKeyPair();
    const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

    let clientOpenedResolve: (() => void) | null = null;
    const clientOpened = new Promise<void>((resolve) => {
      clientOpenedResolve = resolve;
    });

    const daemonChannelPromise = createDaemonChannel(
      daemonTransport,
      daemonKeyPair
    );
    const clientChannel = await createClientChannel(
      clientTransport,
      daemonPubKeyB64,
      { onopen: () => clientOpenedResolve?.() }
    );
    await daemonChannelPromise;
    await clientOpened;

    (clientTransport.send as ReturnType<typeof mock>).mockClear();

    const plaintext = "Secret message";
    await clientChannel.send(plaintext);

    expect(clientTransport.send).toHaveBeenCalledTimes(1);
    const sentData = (clientTransport.send as ReturnType<typeof mock>).mock
      .calls[0][0];

    expect(typeof sentData).toBe("string");
    expect(sentData).not.toContain(plaintext);
    expect(sentData.length).toBeGreaterThan(plaintext.length + 20);
  });

  it("does not throw uncaught when handshake hello retry send fails", async () => {
    const originalSetInterval = globalThis.setInterval;
    let capturedCallback: (() => void) | null = null;
    globalThis.setInterval = ((callback: () => void) => {
      capturedCallback = callback;
      return 999;
    }) as unknown as typeof globalThis.setInterval;

    try {
      const daemonKeyPair = generateKeyPair();
      const daemonPubKeyB64 = exportPublicKey(daemonKeyPair.publicKey);

      const transport: Transport = {
        send: mock(),
        close: mock(),
        onmessage: null,
        onclose: null,
        onerror: null,
      };

      let sendAttempts = 0;
      (transport.send as ReturnType<typeof mock>).mockImplementation(() => {
        sendAttempts += 1;
        if (sendAttempts >= 2) {
          throw new Error("WebSocket not open (readyState=2)");
        }
      });

      const onerror = mock();
      await createClientChannel(transport, daemonPubKeyB64, { onerror });

      expect(capturedCallback).not.toBeNull();
      expect(() => {
        capturedCallback?.();
      }).not.toThrow();

      expect(onerror).toHaveBeenCalledTimes(1);
      expect(onerror.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((onerror.mock.calls[0][0] as Error).message).toContain(
        "WebSocket not open"
      );

      transport.onclose?.(1000, "closed");
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("fails handshake on invalid hello", async () => {
    const [daemonTransport] = createMockTransportPair();

    const daemonKeyPair = generateKeyPair();

    const daemonChannelPromise = createDaemonChannel(
      daemonTransport,
      daemonKeyPair
    );

    setTimeout(() => {
      daemonTransport.onmessage?.('{"type":"invalid"}');
    }, 0);

    await expect(daemonChannelPromise).rejects.toThrow("Invalid hello message");
  });
});
