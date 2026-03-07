import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { internalServerUrl } from "@/lib/urls";

const SESSION_COOKIE_NAME = "openbeam-session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await fetch(`${internalServerUrl}/api/auth/signout`, {
        method: "POST",
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });
    } catch (_err) {
      const _ignored = _err;
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
