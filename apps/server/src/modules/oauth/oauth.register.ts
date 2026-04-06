import { OpenAPIHono } from "@hono/zod-openapi";
import db, { createDCRApplication } from "@openbeam/db";
import { rateLimiter } from "@openbeam/redis";
import { z } from "zod";
import type { AuthEnv } from "@/middleware/auth";

const HTTPS_OR_LOCAL_OR_NATIVE =
  /^(https:\/\/|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?|[a-z][a-z0-9+.-]*:\/\/)/;

const DCR_RATE_LIMIT_PER_HOUR = 10;
const DCR_RATE_LIMIT_WINDOW_SECONDS = 3600;

const RegisterBodySchema = z.object({
  client_name: z.string().min(1).max(256),
  redirect_uris: z.array(z.string().regex(HTTPS_OR_LOCAL_OR_NATIVE)).min(1),
  grant_types: z
    .array(z.string())
    .default(["authorization_code", "refresh_token"]),
  token_endpoint_auth_method: z.string().default("none"),
  scope: z.string().optional(),
  logo_uri: z.string().url().optional(),
  client_uri: z.string().url().optional(),
});

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

const register = new OpenAPIHono<AuthEnv>();

register.post("/oauth/register", async (c) => {
  const ip = getClientIp(c.req.raw);
  const allowed = await rateLimiter.checkLimit(
    `oauth:dcr:${ip}`,
    DCR_RATE_LIMIT_PER_HOUR,
    DCR_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return c.json(
      {
        error: "too_many_requests",
        error_description: "Too many registration requests. Try again later.",
      },
      429
    );
  }

  const body = await c.req.json();
  const parsed = RegisterBodySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  const { client_name, redirect_uris, scope, logo_uri, client_uri } =
    parsed.data;

  const scopes = scope ? scope.split(" ").filter(Boolean) : [];

  const result = await createDCRApplication(db, {
    name: client_name,
    redirectUris: redirect_uris,
    scopes,
    logoUrl: logo_uri,
    website: client_uri,
  });

  return c.json(
    {
      client_id: result.clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name,
      redirect_uris,
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "none",
      response_types: ["code"],
      scope: scopes.join(" "),
      ...(logo_uri ? { logo_uri } : {}),
      ...(client_uri ? { client_uri } : {}),
    },
    201
  );
});

export default register;
