import { OpenAPIHono } from "@hono/zod-openapi";
import db, { createDCRApplication } from "@openbeam/db";
import { z } from "zod";
import type { AuthEnv } from "@/middleware/auth";

const HTTPS_OR_LOCAL_OR_NATIVE =
  /^(https:\/\/|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?|[a-z][a-z0-9+.-]*:\/\/)/;

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

const register = new OpenAPIHono<AuthEnv>();

register.post("/register", async (c) => {
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
      client_name,
      redirect_uris,
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "none",
      response_types: ["code"],
    },
    201
  );
});

export default register;
