import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverUrl } from "@/lib/urls";

const SESSION_COOKIE_NAME = "openplane-session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await fetch(`${serverUrl}/api/auth/signout`, {
        method: "POST",
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });
    } catch {
      // Server signout failed, continue with local cookie deletion
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
