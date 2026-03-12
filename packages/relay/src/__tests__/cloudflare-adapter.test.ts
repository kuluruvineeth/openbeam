import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import relayWorker, { RelayDurableObject } from "../cloudflare-adapter";

type MockSocket = WebSocket & {
  send: ReturnType<typeof mock>;
  close: ReturnType<typeof mock>;
  serializeAttachment: ReturnType<typeof mock>;
  deserializeAttachment: ReturnType<typeof mock>;
};

function createMockSocket(attachment: unknown = null): MockSocket {
  let storedAttachment = attachment;
  return {
    send: mock(),
    close: mock(),
    serializeAttachment: mock((value: unknown) => {
      storedAttachment = value;
    }),
    deserializeAttachment: mock(() => storedAttachment),
  } as unknown as MockSocket;
}

function createMockState() {
  const socketsByTag = new Map<string, WebSocket[]>();
  const state = {
    acceptWebSocket: mock(),
    getWebSockets: mock((tag?: string): WebSocket[] => {
      if (!tag) {
        const out: WebSocket[] = [];
        for (const sockets of socketsByTag.values()) {
          out.push(...sockets);
        }
        return out;
      }
      return socketsByTag.get(tag) ?? [];
    }),
  };

  return {
    state,
    setTagSockets: (tag: string, sockets: WebSocket[]) => {
      socketsByTag.set(tag, sockets);
    },
  };
}

async function withMockWebSocketPair(
  run: (sockets: {
    clientWs: MockSocket;
    serverWs: MockSocket;
  }) => Promise<void> | void
): Promise<void> {
  const serverWs = createMockSocket();
  const clientWs = createMockSocket();
  const WebSocketPairMock = class {
    [index: number]: WebSocket;
    constructor() {
      this[0] = clientWs as unknown as WebSocket;
      this[1] = serverWs as unknown as WebSocket;
    }
  };

  const previousPair = (globalThis as unknown as { WebSocketPair?: unknown })
    .WebSocketPair;
  (globalThis as unknown as { WebSocketPair: unknown }).WebSocketPair =
    WebSocketPairMock;
  try {
    await run({ clientWs, serverWs });
  } finally {
    if (previousPair === undefined) {
      (globalThis as unknown as { WebSocketPair?: unknown }).WebSocketPair =
        undefined;
    } else {
      (globalThis as unknown as { WebSocketPair: unknown }).WebSocketPair =
        previousPair;
    }
  }
}

describe("RelayDurableObject versioning", () => {
  it("accepts legacy v1 client sockets without clientId", async () => {
    const { state } = createMockState();
    await withMockWebSocketPair(() => {
      const relay = new RelayDurableObject(state as any);
      const req = new Request(
        "https://relay.test/ws?role=client&serverId=srv_test&v=1",
        {
          headers: {
            Upgrade: "websocket",
          },
        }
      );
      try {
        relay.fetch(req);
      } catch {
        // WebSocketPair mock may throw in non-CF environments
      }
      expect(state.acceptWebSocket).toHaveBeenCalled();
    });
  });

  it("rejects v2 client sockets when clientId is missing", async () => {
    const { state } = createMockState();
    const relay = new RelayDurableObject(state as any);
    const req = new Request(
      "https://relay.test/ws?role=client&serverId=srv_test&v=2"
    );
    const response = relay.fetch(req);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing clientId parameter");
  });
});

describe("RelayDurableObject control nudge/reset behavior", () => {
  let originalSetTimeout: typeof globalThis.setTimeout;
  let capturedCallbacks: Array<{ callback: () => void; delay: number }>;

  beforeEach(() => {
    originalSetTimeout = globalThis.setTimeout;
    capturedCallbacks = [];
    globalThis.setTimeout = ((callback: () => void, delay: number) => {
      capturedCallbacks.push({ callback, delay });
      return capturedCallbacks.length;
    }) as unknown as typeof globalThis.setTimeout;
  });

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
  });

  it("does not nudge or reset control after the client already disconnected", () => {
    const clientId = "clt_stale_timer";
    const control = createMockSocket();
    const { state, setTagSockets } = createMockState();

    setTagSockets("server-control", [control]);
    setTagSockets("client", []);
    setTagSockets(`client:${clientId}`, []);
    setTagSockets(`server:${clientId}`, []);

    const relay = new RelayDurableObject(state as any);
    (relay as any).nudgeOrResetControlForClient(clientId);

    expect(capturedCallbacks).toHaveLength(1);
    expect(capturedCallbacks[0].delay).toBe(10_000);

    capturedCallbacks[0].callback();

    for (const cb of capturedCallbacks.slice(1)) {
      cb.callback();
    }

    expect(control.send).not.toHaveBeenCalled();
    expect(control.close).not.toHaveBeenCalled();
  });

  it("resets control when the client remains connected but no server-data socket appears", () => {
    const clientId = "clt_waiting_for_daemon";
    const control = createMockSocket();
    const client = createMockSocket({
      role: "client",
      clientId,
      serverId: "srv_test",
      createdAt: Date.now(),
    });
    const { state, setTagSockets } = createMockState();

    setTagSockets("server-control", [control]);
    setTagSockets("client", [client]);
    setTagSockets(`client:${clientId}`, [client]);
    setTagSockets(`server:${clientId}`, []);

    const relay = new RelayDurableObject(state as any);
    (relay as any).nudgeOrResetControlForClient(clientId);

    expect(capturedCallbacks).toHaveLength(1);
    capturedCallbacks[0].callback();

    expect(control.send).toHaveBeenCalledTimes(1);

    expect(capturedCallbacks).toHaveLength(2);
    expect(capturedCallbacks[1].delay).toBe(5000);
    capturedCallbacks[1].callback();

    expect(control.close).toHaveBeenCalledWith(1011, "Control unresponsive");
  });

  it("does not replace existing client sockets for the same clientId", async () => {
    const existingClient = createMockSocket({
      version: "2",
      role: "client",
      clientId: "clt_same_session",
      serverId: "srv_test",
      createdAt: Date.now(),
    });
    const { state, setTagSockets } = createMockState();
    setTagSockets("client:clt_same_session", [existingClient]);
    setTagSockets("client", [existingClient]);

    await withMockWebSocketPair(() => {
      const relay = new RelayDurableObject(state as any);
      const req = new Request(
        "https://relay.test/ws?role=client&serverId=srv_test&clientId=clt_same_session&v=2",
        {
          headers: {
            Upgrade: "websocket",
          },
        }
      );

      try {
        relay.fetch(req);
      } catch {
        // WebSocketPair mock may throw in non-CF environments
      }
      expect(existingClient.close).not.toHaveBeenCalled();
    });
  });

  it("keeps server data socket alive while at least one client socket remains", () => {
    const clientId = "clt_multi";
    const disconnectedClient = createMockSocket({
      version: "2",
      role: "client",
      clientId,
      serverId: "srv_test",
      createdAt: Date.now(),
    });
    const stillConnectedClient = createMockSocket({
      version: "2",
      role: "client",
      clientId,
      serverId: "srv_test",
      createdAt: Date.now(),
    });
    const serverData = createMockSocket();
    const control = createMockSocket();
    const { state, setTagSockets } = createMockState();

    setTagSockets("server-control", [control]);
    setTagSockets(`server:${clientId}`, [serverData]);
    setTagSockets("client", [stillConnectedClient]);
    setTagSockets(`client:${clientId}`, [stillConnectedClient]);

    const relay = new RelayDurableObject(state as any);
    relay.webSocketClose(
      disconnectedClient as unknown as WebSocket,
      1001,
      "Client disconnected",
      true
    );

    expect(serverData.close).not.toHaveBeenCalled();
    expect(control.send).not.toHaveBeenCalledWith(
      JSON.stringify({ type: "client_disconnected", clientId })
    );
  });
});

describe("relay worker endpoint routing", () => {
  it("routes missing v to legacy v1 isolated DO ids", async () => {
    const fetchFn = mock(
      async (request: Request) =>
        new Response(`ok:${new URL(request.url).searchParams.get("v")}`)
    );
    const get = mock(() => ({ fetch: fetchFn }));
    const idFromName = mock(() => ({ toString: () => "id" }));

    const response = await relayWorker.fetch(
      new Request("https://relay.test/ws?serverId=srv_test&role=server"),
      { RELAY: { idFromName, get } } as any
    );

    expect(idFromName).toHaveBeenCalledWith("relay-v1:srv_test");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe("ok:1");
  });

  it("routes v=2 to v2 isolated DO ids", async () => {
    const fetchFn = mock(
      async (request: Request) =>
        new Response(`ok:${new URL(request.url).searchParams.get("v")}`)
    );
    const get = mock(() => ({ fetch: fetchFn }));
    const idFromName = mock(() => ({ toString: () => "id" }));

    const response = await relayWorker.fetch(
      new Request("https://relay.test/ws?serverId=srv_test&role=server&v=2"),
      { RELAY: { idFromName, get } } as any
    );

    expect(idFromName).toHaveBeenCalledWith("relay-v2:srv_test");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe("ok:2");
  });

  it("rejects invalid v values", async () => {
    const fetchFn = mock();
    const get = mock(() => ({ fetch: fetchFn }));
    const idFromName = mock(() => ({ toString: () => "id" }));

    const response = await relayWorker.fetch(
      new Request("https://relay.test/ws?serverId=srv_test&role=server&v=nope"),
      { RELAY: { idFromName, get } } as any
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid v parameter (expected 1 or 2)");
    expect(idFromName).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
