"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { OAuthConsentScreen } from "./oauth-consent-screen";

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

type AppInfoResponse = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  clientId: string;
  scopes: string[];
  redirectUri: string;
  state: string;
};

type AppInfoError = {
  error: string;
  error_description?: string;
};

async function fetchAppInfo(params: URLSearchParams): Promise<AppInfoResponse> {
  const qs = new URLSearchParams();
  for (const key of [
    "client_id",
    "redirect_uri",
    "response_type",
    "scope",
    "state",
    "code_challenge",
    "code_challenge_method",
  ]) {
    const val = params.get(key);
    if (val) {
      qs.set(key, val);
    }
  }

  const response = await fetch(`${API_URL}/oauth/authorize?${qs.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const err: AppInfoError = await response
      .json()
      .catch(() => ({ error: "unknown" }));
    throw new Error(
      err.error_description ?? err.error ?? "Failed to load application info"
    );
  }

  return response.json();
}

export function OAuthAuthorizeContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id");
  const codeChallenge = searchParams.get("code_challenge") ?? undefined;

  const {
    data: app,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["oauth-app-info", clientId],
    queryFn: () => fetchAppInfo(searchParams),
    enabled: Boolean(clientId),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (!clientId) {
    return (
      <OAuthErrorScreen
        message="Missing client_id parameter."
        title="Invalid Request"
      />
    );
  }

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <OAuthErrorScreen
        message={
          error instanceof Error
            ? error.message
            : "Failed to load application info"
        }
        title="Authorization Error"
      />
    );
  }

  if (!app) {
    return (
      <OAuthErrorScreen message="Application not found." title="Not Found" />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <OAuthConsentScreen app={app} codeChallenge={codeChallenge} />
    </main>
  );
}

function OAuthErrorScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-sm border border-border/50 p-6 text-center">
        <Icons.AlertCircle
          className="mx-auto mb-3 text-destructive"
          size={32}
        />
        <h1 className="font-semibold text-lg">{title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{message}</p>
      </div>
    </main>
  );
}
