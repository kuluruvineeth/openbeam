"use client";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";
import { OAuthScopeItem } from "./oauth-scope-item";

type OAuthAppInfo = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  clientId: string;
  scopes: string[];
  redirectUri: string;
  state: string;
};

type OAuthConsentProps = {
  app: OAuthAppInfo;
  codeChallenge?: string;
};

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

function AppLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <Image
        alt={name}
        className="h-16 w-16 rounded-sm border border-border/50 object-contain"
        height={64}
        src={logoUrl}
        width={64}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-border/50 bg-muted font-semibold text-2xl text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

async function submitDecision(payload: {
  client_id: string;
  decision: "allow" | "deny";
  scopes: string[];
  redirect_uri: string;
  state: string;
  code_challenge?: string;
  teamId: string;
}): Promise<{ redirect_url: string }> {
  const response = await fetch(`${API_URL}/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "unknown" }));
    throw new Error(
      err.error_description ?? err.error ?? "Authorization failed"
    );
  }

  if (response.redirected) {
    return { redirect_url: response.url };
  }

  return response.json();
}

type Team = { id: string; name: string };

function TeamSelector({
  loading,
  teams,
  value,
  onValueChange,
}: {
  loading: boolean;
  teams: Team[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
}) {
  if (loading) {
    return <div className="h-9 animate-pulse rounded-sm bg-muted" />;
  }

  if (!teams || teams.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <label
        className="font-medium text-muted-foreground text-xs"
        htmlFor="team-select"
      >
        Team
      </label>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className="w-full" id="team-select">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function OAuthConsentScreen({ app, codeChallenge }: OAuthConsentProps) {
  const trpc = useTRPC();
  const { data: teams, isLoading: teamsLoading } = useQuery(
    trpc.team.list.queryOptions()
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teams?.length === 1 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const resolvedTeamId =
    selectedTeamId || (teams?.length === 1 ? teams[0].id : "");

  const canSubmit = Boolean(resolvedTeamId) && !submitting && !teamsLoading;

  const handleAuthorize = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitDecision({
        client_id: app.clientId,
        decision: "allow",
        scopes: app.scopes,
        redirect_uri: app.redirectUri,
        state: app.state,
        code_challenge: codeChallenge,
        teamId: resolvedTeamId,
      });
      window.location.href = result.redirect_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed");
      setSubmitting(false);
    }
  }, [app, codeChallenge, resolvedTeamId, canSubmit]);

  const handleDeny = useCallback(async () => {
    if (!resolvedTeamId || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitDecision({
        client_id: app.clientId,
        decision: "deny",
        scopes: app.scopes,
        redirect_uri: app.redirectUri,
        state: app.state,
        code_challenge: codeChallenge,
        teamId: resolvedTeamId,
      });
      window.location.href = result.redirect_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny");
      setSubmitting(false);
    }
  }, [app, codeChallenge, resolvedTeamId, submitting]);

  useHotkeys("enter", handleAuthorize, {
    enabled: canSubmit,
    enableOnFormTags: false,
  });

  useHotkeys("escape", handleDeny, {
    enabled: Boolean(resolvedTeamId) && !submitting,
  });

  return (
    <div className="w-full max-w-md rounded-sm border border-border/50 bg-background p-6">
      <div className="flex flex-col items-center gap-3">
        <AppLogo logoUrl={app.logoUrl} name={app.name} />
        <div className="text-center">
          <h1 className="font-semibold text-lg">{app.name}</h1>
          {app.website && (
            <a
              className="text-muted-foreground text-sm hover:underline"
              href={app.website}
              rel="noopener noreferrer"
              target="_blank"
            >
              {new URL(app.website).hostname}
            </a>
          )}
        </div>
        {app.description && (
          <p className="text-center text-muted-foreground text-sm">
            {app.description}
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          wants to access your OpenBeam data
        </p>
      </div>

      <Separator className="my-4" />

      <div className="space-y-1">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Permissions
        </p>
        {app.scopes.map((scope) => (
          <OAuthScopeItem key={scope} scope={scope} />
        ))}
      </div>

      <div className="mt-4 rounded-sm border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
        <div className="flex items-start gap-2">
          <Icons.AlertCircle
            className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400"
            size={14}
          />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            This application has not been verified by OpenBeam. Proceed only if
            you trust the developer.
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      <TeamSelector
        loading={teamsLoading}
        onValueChange={setSelectedTeamId}
        teams={teams}
        value={selectedTeamId}
      />

      {error && <p className="mt-3 text-destructive text-sm">{error}</p>}

      <div className="mt-4 flex gap-3">
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={handleDeny}
          variant="ghost"
        >
          Deny
        </Button>
        <Button
          className="flex-1"
          disabled={!canSubmit}
          onClick={handleAuthorize}
        >
          {submitting ? "Authorizing..." : "Authorize"}
        </Button>
      </div>
    </div>
  );
}
