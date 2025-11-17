import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth } from "./lib/auth/server";

export async function proxy(request: NextRequest) {
  const { user } = await getAuth();
  const url = request.nextUrl.clone();

  const publicPaths = ["/login"];

  // Not logged in and trying to access a non-public page → go to login
  if (!(user || publicPaths.includes(url.pathname))) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in and visiting login page → send to app root
  if (user && url.pathname === "/login") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Otherwise, just continue
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
