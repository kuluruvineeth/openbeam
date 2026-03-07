import type { NextRequest } from "next/server";
import { internalServerUrl } from "@/lib/urls.server";

const PROXY_HEADERS_SKIP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

const TRPC_PREFIX = /^\/api\/trpc\//;

function buildUpstreamUrl(req: NextRequest): string {
  const trpcPath = req.nextUrl.pathname.replace(TRPC_PREFIX, "");
  const search = req.nextUrl.search;
  return `${internalServerUrl}/trpc/${trpcPath}${search}`;
}

function forwardHeaders(req: NextRequest): Headers {
  const forwarded = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!PROXY_HEADERS_SKIP.has(key.toLowerCase())) {
      forwarded.set(key, value);
    }
  }
  return forwarded;
}

async function proxy(req: NextRequest): Promise<Response> {
  const url = buildUpstreamUrl(req);
  const headers = forwardHeaders(req);

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error -- Node fetch supports duplex for streaming request bodies
    duplex: req.body ? "half" : undefined,
  });

  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (!PROXY_HEADERS_SKIP.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  const isSSE =
    upstream.headers.get("content-type")?.includes("text/event-stream") ??
    false;

  if (isSSE && upstream.body) {
    responseHeaders.set("content-type", "text/event-stream");
    responseHeaders.set("cache-control", "no-cache, no-transform");
    responseHeaders.set("x-accel-buffering", "no");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const dynamic = "force-dynamic";
