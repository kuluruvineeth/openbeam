import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { internalServerUrl } from "@/lib/urls.server";

const SESSION_COOKIE_NAME = "openbeam-session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  const response = await fetch(`${internalServerUrl}/oauth/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
