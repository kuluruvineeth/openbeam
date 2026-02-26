import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { z } from "zod";
import type { OAuthProvider, Session, TeamMembership } from "./auth-types";
import {
  deleteSessionToken,
  getSessionToken,
  setSessionToken,
} from "./token-storage";

const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

const SessionSchema = z.object({
  user: SessionUserSchema.nullable(),
});

const TeamMembershipSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  teamSlug: z.string(),
  teamLogo: z.string().nullable(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

const TeamsResponseSchema = z.object({
  teams: z.array(TeamMembershipSchema).optional().default([]),
});

const RefreshResponseSchema = SessionSchema.extend({
  token: z.string().optional(),
});

const API_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";

async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export async function getSession(): Promise<Session> {
  const response = await authFetch("/api/auth/session");
  if (!response.ok) {
    return { user: null };
  }
  const data: unknown = await response.json();
  return SessionSchema.parse(data);
}

export async function signInWithOAuth(
  provider: OAuthProvider
): Promise<boolean> {
  const redirectUrl = Linking.createURL("auth/callback");
  const authUrl = `${API_BASE_URL}/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(redirectUrl)}&mobile=true`;

  if (Platform.OS === "web") {
    window.location.href = authUrl;
    return true;
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

  if (result.type === "success" && result.url) {
    const url = new URL(result.url);
    const token = url.searchParams.get("token");
    if (token) {
      await setSessionToken(token);
      return true;
    }
  }

  return false;
}

export async function signOut(): Promise<void> {
  await authFetch("/api/auth/signout", { method: "POST" });
  await deleteSessionToken();
}

export async function getTeamMemberships(): Promise<TeamMembership[]> {
  const response = await authFetch("/api/auth/teams");
  if (!response.ok) {
    return [];
  }
  const data: unknown = await response.json();
  const parsed = TeamsResponseSchema.parse(data);
  return parsed.teams;
}

export async function selectTeam(teamId: string): Promise<boolean> {
  const response = await authFetch("/api/auth/team/select", {
    method: "POST",
    body: JSON.stringify({ teamId }),
  });
  return response.ok;
}

export async function refreshSession(): Promise<Session> {
  const response = await authFetch("/api/auth/refresh", { method: "POST" });
  if (!response.ok) {
    return { user: null };
  }
  const data: unknown = await response.json();
  const parsed = RefreshResponseSchema.parse(data);
  if (parsed.token) {
    await setSessionToken(parsed.token);
  }
  return { user: parsed.user };
}
