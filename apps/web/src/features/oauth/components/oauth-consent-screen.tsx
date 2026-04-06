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
import { OAuthScopeItem } from "@openbeam/ui/components/oauth-scope-item";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";

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

import { resolveLogo } from "@openbeam/ui/components/mcp-client-logo";

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

  const LogoComponent = resolveLogo(name);
  if (LogoComponent) {
    return LogoComponent({ size: 64 });
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-border/50 bg-muted font-semibold text-2xl text-muted-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
  );
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
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teams?.length === 1 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const resolvedTeamId =
    selectedTeamId || (teams?.length === 1 ? teams[0].id : "");

  const canSubmit = Boolean(resolvedTeamId) && !submitting && !teamsLoading;

  const authorizeMutation = useMutation(
    trpc.oauthApplications.authorize.mutationOptions({
      onSuccess: (result) => {
        setAuthorized(true);
        window.location.href = result.redirectUrl;
      },
      onError: (err) => {
        setError(err.message);
        setSubmitting(false);
      },
    })
  );

  const handleAuthorize = useCallback(() => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    authorizeMutation.mutate({
      clientId: app.clientId,
      decision: "allow",
      scopes: app.scopes,
      redirectUri: app.redirectUri,
      state: app.state,
      codeChallenge,
      teamId: resolvedTeamId,
    });
  }, [app, codeChallenge, resolvedTeamId, canSubmit, authorizeMutation]);

  const handleDeny = useCallback(() => {
    if (!resolvedTeamId || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    authorizeMutation.mutate({
      clientId: app.clientId,
      decision: "deny",
      scopes: app.scopes,
      redirectUri: app.redirectUri,
      state: app.state,
      codeChallenge,
      teamId: resolvedTeamId,
    });
  }, [app, codeChallenge, resolvedTeamId, submitting, authorizeMutation]);

  useHotkeys("enter", handleAuthorize, {
    enabled: canSubmit,
    enableOnFormTags: false,
  });

  useHotkeys("escape", handleDeny, {
    enabled: Boolean(resolvedTeamId) && !submitting,
  });

  if (authorized) {
    return (
      <div className="w-full max-w-md rounded-sm border border-border/50 bg-background p-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Icons.Check className="text-emerald-500" size={24} />
          </div>
          <div className="text-center">
            <h1 className="font-semibold text-lg">Connected</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {app.name} has been authorized. You can close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
