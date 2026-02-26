import { publicServerUrl } from "@/lib/urls";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

export type Session = {
  user: SessionUser | null;
};

export function signIn(provider: string, callbackUrl?: string): void {
  const url = new URL(`${publicServerUrl}/api/auth/signin/${provider}`);
  url.searchParams.set("callbackUrl", callbackUrl || window.location.origin);
  window.location.href = url.toString();
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}

export async function getSession(): Promise<Session> {
  const response = await fetch("/api/auth/session");
  return response.json();
}
