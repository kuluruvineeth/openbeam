import { getCookieCache } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  const publicPrefixes = ["/login", "/assets", "/fonts"] as const;
  const isPublicPath = publicPrefixes.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );

  // Use getCookieCache to read session from cookie cache (non-blocking, fast)
  // This avoids database calls and is optimized for middleware/proxy
  // Note: This reads from cookie cache, so it's optimistic but fast
  //TODO: Later add checks in protected layouts aswell for more security
  const session = await getCookieCache(request, {
    cookiePrefix: "openplane-auth",
  });

  const user = session?.user ?? null;

  // Not logged in and trying to access a non-public page → go to login
  if (!(user || isPublicPath)) {
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
