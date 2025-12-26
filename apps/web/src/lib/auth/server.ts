import { cookies } from "next/headers";
import { cache } from "react";
import { serverUrl } from "@/lib/urls";

const SESSION_COOKIE_NAME = "openplane-session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export interface AuthResult {
  user: SessionUser | null;
}

export const getAuth = cache(async (): Promise<AuthResult> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return { user: null };
    }

    const response = await fetch(`${serverUrl}/api/auth/session`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return { user: null };
    }

    const data = (await response.json()) as { user: SessionUser | null };
    return { user: data.user };
  } catch (error) {
    console.error("Error getting auth session", error);
    return { user: null };
  }
});
