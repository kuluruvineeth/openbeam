import { NextResponse } from "next/server";

export function proxy() {
  // Later we will use this just as route navigator as purely proxy and not as middleware
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
