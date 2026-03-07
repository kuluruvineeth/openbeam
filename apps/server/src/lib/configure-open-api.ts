import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { AuthEnv } from "@/middleware/auth";

export function configureOpenAPI(app: OpenAPIHono<AuthEnv>) {
  // 1. The OpenAPI Spec
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "OpenBeam API",
      description: "Public API for OpenBeam integrations and connectors",
    },
    security: [
      {
        bearerAuth: [],
        apiKeyAuth: [],
      },
    ],
  });

  // 2. The Scalar UI
  app.get(
    "/reference",
    Scalar({
      theme: "kepler",
      url: "/doc",
    })
  );
}
