import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverUrl } from "@/lib/urls";

const SESSION_COOKIE_NAME = "openplane-session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const response = await fetch(`${serverUrl}/api/auth/session`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ user: null });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
