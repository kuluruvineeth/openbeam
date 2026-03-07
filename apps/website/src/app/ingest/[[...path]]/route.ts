import { type NextRequest, NextResponse } from "next/server";

const POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_ASSETS = "https://us-assets.i.posthog.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

async function proxy(request: NextRequest, { path }: { path?: string[] }) {
  const joined = path?.join("/") ?? "";
  const isStatic = joined.startsWith("static/") || joined.startsWith("static");
  const host = isStatic ? POSTHOG_ASSETS : POSTHOG_HOST;
  const url = new URL(`/${joined}${request.nextUrl.search}`, host);

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  }
  headers.set("host", url.host);

  const body = request.method === "POST" ? await request.text() : undefined;

  try {
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
