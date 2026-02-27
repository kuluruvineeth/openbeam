import type { Hono } from "hono";
import type pino from "pino";
import type { DaemonConfig } from "../config.js";
import type { DaemonKeyPair } from "../daemon-keypair.js";
import type { DownloadTokenStore } from "../file-download/token-store.js";
import { createFilesRoutes } from "./files.js";
import { createHealthRoutes } from "./health.js";
import { createInfoRoutes } from "./info.js";

export type RouteContext = {
  serverId: string;
  keyPair: DaemonKeyPair;
  config: DaemonConfig;
  downloadTokenStore: DownloadTokenStore;
  logger: pino.Logger;
};

export function mountRoutes(app: Hono, ctx: RouteContext): void {
  app.route("/", createHealthRoutes(ctx.serverId));
  app.route(
    "/",
    createInfoRoutes({
      serverId: ctx.serverId,
      keyPair: ctx.keyPair,
      config: ctx.config,
    })
  );
  app.route(
    "/",
    createFilesRoutes({
      downloadTokenStore: ctx.downloadTokenStore,
      logger: ctx.logger,
    })
  );
}
