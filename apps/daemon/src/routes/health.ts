import { Hono } from "hono";

export function createHealthRoutes(serverId: string): Hono {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      serverId,
      version: "0.1.0",
      uptime: process.uptime(),
    })
  );

  return app;
}
