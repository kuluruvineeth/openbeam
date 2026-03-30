import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import db, { revokeOAuthAccessToken } from "@openbeam/db";

const revokeRoute = createRoute({
  method: "post",
  path: "/oauth/revoke",
  tags: ["OAuth"],
  responses: {
    200: {
      description: "Token revoked",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
  },
});

async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await req.json()) as Record<string, string>;
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  try {
    return (await req.json()) as Record<string, string>;
  } catch {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }
}

const router = new OpenAPIHono();

router.openapi(revokeRoute, async (c) => {
  const body = await parseBody(c.req.raw.clone());
  const { token } = body;

  if (!token) {
    return c.json({ success: true }, 200);
  }

  await revokeOAuthAccessToken(db, token);

  return c.json({ success: true }, 200);
});

export default router;
