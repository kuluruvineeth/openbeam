import { Hono } from "hono";
import type { DaemonConfig } from "../config";
import type { DaemonKeyPair } from "../daemon-keypair";

type InfoRouteOptions = {
  serverId: string;
  keyPair: DaemonKeyPair;
  config: DaemonConfig;
};

export function createInfoRoutes({
  serverId,
  keyPair,
  config,
}: InfoRouteOptions): Hono {
  const app = new Hono();

  app.get("/info", (c) =>
    c.json({
      serverId,
      publicKey: keyPair.publicKey,
      relay: config.relayEnabled
        ? { endpoint: config.relayPublicEndpoint }
        : null,
      mcp: config.mcpEnabled,
    })
  );

  return app;
}
